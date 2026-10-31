// HTTP-level tests for the procurement routes.
// The routers are mounted on a bare Express app with in-memory models, so status
// codes, headers, validation and rate limiting are verified without MongoDB.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { registerProcurementRoutes } from "./procurement-routes.mjs";

// --- In-memory model fakes --------------------------------------------------

const setPath = (target, path, value) => {
  const keys = path.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
};

const valueAt = (row, path) => path.split(".").reduce((value, part) => (value == null ? value : value[part]), row);

const matches = (row, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((clause) => matches(row, clause));
    const actual = valueAt(row, key);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("$gt" in expected) return actual > expected.$gt;
      if ("$ne" in expected) return actual !== expected.$ne;
      if ("$gte" in expected) return actual >= expected.$gte;
      if ("$lte" in expected) return actual <= expected.$lte;
      if ("$regex" in expected) return new RegExp(expected.$regex, expected.$options || "").test(String(actual ?? ""));
      if ("$nin" in expected) return !expected.$nin.includes(actual);
    }
    return actual === expected;
  });

function fakeModel(seed = []) {
  const rows = seed.map((row, index) => ({ _id: `id-${index + 1}`, createdAt: new Date(), updatedAt: new Date(), ...row }));
  const query = (results) => {
    const state = { results, skip: 0, limit: Infinity };
    const api = {
      sort: () => api,
      skip: (count) => {
        state.skip = count;
        return api;
      },
      limit: (count) => {
        state.limit = count;
        return api;
      },
      lean: async () => state.results.slice(state.skip, state.skip + state.limit).map((row) => ({ ...row })),
      then: (resolve, reject) => Promise.resolve(state.results.slice(state.skip, state.skip + state.limit)).then(resolve, reject),
    };
    return api;
  };
  // A Mongoose document mutates the underlying row; the fake must behave the same
  // way so field assignments followed by save() are observable afterwards.
  const doc = (row) => {
    if (!row) return null;
    const wrapper = { ...row };
    wrapper.toObject = () => ({ ...row });
    wrapper.save = async () => {
      for (const [key, value] of Object.entries(wrapper)) {
        if (key === "toObject" || key === "save") continue;
        row[key] = value;
      }
      return wrapper;
    };
    return wrapper;
  };

  return {
    rows,
    find(query = {}) {
      return query_(rows.filter((row) => matches(row, query)));
    },
    findOne(query = {}) {
      const found = rows.find((row) => matches(row, query));
      return { lean: async () => (found ? { ...found } : null) };
    },
    findById(id) {
      const found = rows.find((row) => row._id === id);
      return {
        lean: async () => (found ? { ...found } : null),
        then: (resolve, reject) => Promise.resolve(doc(found)).then(resolve, reject),
      };
    },
    async create(body) {
      const row = {
        _id: `id-${rows.length + 1}`,
        status: "new",
        createdAt: new Date(),
        updatedAt: new Date(),
        notifications: {
          customer: { status: "pending", attempts: 0 },
          internal: { status: "pending", attempts: 0 },
          webhook: { status: "pending", attempts: 0 },
        },
        ...body,
      };
      rows.push(row);
      return doc(row);
    },
    async findByIdAndUpdate(id, update) {
      const row = rows.find((candidate) => candidate._id === id);
      if (!row) return null;
      Object.assign(row, update);
      return doc(row);
    },
    async findByIdAndDelete(id) {
      const index = rows.findIndex((candidate) => candidate._id === id);
      if (index === -1) return null;
      return doc(rows.splice(index, 1)[0]);
    },
    async updateOne(query, update) {
      const row = rows.find((candidate) => matches(candidate, query));
      if (!row) return { modifiedCount: 0 };
      for (const [path, value] of Object.entries(update.$set || {})) setPath(row, path, value);
      return { modifiedCount: 1 };
    },
    async countDocuments(filters = {}) {
      return rows.filter((row) => matches(row, filters)).length;
    },
    async aggregate() {
      return [];
    },
  };

  function query_(results) {
    return query(results);
  }
}

function fakeCounter() {
  return {
    value: 0,
    findOneAndUpdate() {
      this.value += 1;
      const sequence = this.value;
      return { lean: async () => ({ sequence }) };
    },
  };
}

const validBody = () => ({
  fullName: "Priya Nair",
  workEmail: "priya@sunridgepower.in",
  phone: "+919876500011",
  companyName: "Sunridge Power",
  projectType: "utility-tender",
  volumeTier: "5mw-25mw",
  moduleTechnology: "hjt",
  dispatchTimeline: "immediate",
  targetLocation: { country: "India", state: "Karnataka", city: "Bengaluru", site: "Pavagada" },
  specificationRequirements: "1500 V DC",
  privacyConsent: true,
});

// --- Harness ---------------------------------------------------------------

let server;
let baseUrl;
let emails = [];
let webhookFailures = false;
const models = {};

const adminGuard = (req, res, next) =>
  req.get("cookie") === "session=valid" ? next() : res.status(401).json({ error: "Admin authentication required" });

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

before(async () => {
  Object.assign(models, {
    Rfq: fakeModel(),
    RfqCounter: fakeCounter(),
    RfqEvent: fakeModel(),
    Product: fakeModel(),
    Certification: fakeModel(),
    ProtectedAudit: fakeModel(),
  });

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  registerProcurementRoutes(app, {
    admin: adminGuard,
    asyncRoute,
    id: (row) => ({ ...row, id: String(row._id), _id: undefined }),
    adminUsername: "tester",
    models,
    services: {
      sendEmail: async (message) => {
        emails.push(message);
        return { sent: true, provider: "smtp", messageId: "test" };
      },
      sendWebhook: async () => (webhookFailures ? { sent: false, error: "WEBHOOK_TIMEOUT" } : { sent: true, status: 200 }),
      rfqNotificationConfiguration: () => ({
        salesInbox: ["sales-leads@solariousenergy.com"],
        highPriorityInbox: ["kam-utility@solariousenergy.com"],
        salesActions: [],
        webhookConfigured: true,
      }),
      notificationStatus: () => ({ emailProvider: "smtp", emailConfigured: true, webhookConfigured: true }),
    },
    rfqYear: () => 2026,
    ipHash: () => "hashed-ip",
    rateLimit: { limit: 5, windowMs: 60 * 60 * 1000 },
    logger: { log: () => {}, error: () => {} },
  });
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message, code: error.code, fields: error.fields });
  });

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// Each request gets its own client IP unless the test supplies one, so the
// per-client submission limiter does not leak between unrelated test cases.
let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter += 1) % 250}`;
const clientIp = (headers) => ({ "X-Forwarded-For": nextIp(), ...headers });

const post = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...clientIp(headers) },
    body: JSON.stringify(body),
  });
const patch = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...clientIp(headers) },
    body: JSON.stringify(body),
  });
const get = (path, headers = {}) => fetch(`${baseUrl}${path}`, { headers: clientIp(headers) });
const admin = { cookie: "session=valid" };

// --- Public submission ------------------------------------------------------

test("POST /api/rfqs creates an RFQ with a server-generated reference", async () => {
  const response = await post("/api/rfqs", validBody(), { "Idempotency-Key": "http-key-1" });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.match(body.rfq.rfqReferenceId, /^SOL-RFQ-2026-\d{6}$/);
  assert.equal(body.rfq.priority, "High");
  assert.equal(body.rfq.volumeTierLabel, "5 MW – 25 MW");
  assert.equal(body.rfq.status, "new");
  // Internal fields must never leak to the submitter.
  for (const hidden of ["internalRemarks", "assignedTo", "sourceIpHash", "submissionKey"]) {
    assert.equal(body.rfq[hidden], undefined, `${hidden} must not be exposed`);
  }
  assert.equal(models.Rfq.rows.filter((row) => row.workEmail === "priya@sunridgepower.in").length, 1);
  assert.ok(emails.some((message) => message.to === "priya@sunridgepower.in"), "customer confirmation is sent");
  assert.ok(emails.some((message) => message.to.includes("kam-utility@solariousenergy.com")), "high-priority desk is notified");
});

test("invalid submissions return 400 with per-field errors and create nothing", async () => {
  const before = models.Rfq.rows.length;
  const response = await post("/api/rfqs", { ...validBody(), workEmail: "bad", privacyConsent: false });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.ok(body.fields.workEmail);
  assert.ok(body.fields.privacyConsent);
  assert.equal(models.Rfq.rows.length, before);
});

test("a repeated idempotency key returns 200 and the original reference", async () => {
  const first = await (await post("/api/rfqs", { ...validBody(), workEmail: "dup@acme.in", companyName: "Dup Co" }, { "Idempotency-Key": "http-key-dup" })).json();
  const second = await post("/api/rfqs", { ...validBody(), workEmail: "dup@acme.in", companyName: "Dup Co" }, { "Idempotency-Key": "http-key-dup" });
  const body = await second.json();
  assert.equal(second.status, 200);
  assert.equal(body.duplicate, true);
  assert.equal(body.rfq.rfqReferenceId, first.rfq.rfqReferenceId);
});

test("rate limiting returns 429 after the configured number of submissions", async () => {
  const statuses = [];
  const sameClient = { "X-Forwarded-For": nextIp() };
  for (let index = 0; index < 8; index += 1) {
    statuses.push(
      (await post("/api/rfqs", { ...validBody(), workEmail: `burst${index}@acme.in`, companyName: `Burst ${index}` }, sameClient)).status,
    );
  }
  assert.ok(statuses.includes(429), `expected a 429 in ${statuses.join(",")}`);
  assert.equal(statuses.filter((status) => status === 429).length >= 1, true);
});

// --- Admin auth -------------------------------------------------------------

test("admin RFQ endpoints reject requests without a session", async () => {
  for (const path of ["/api/admin/rfqs", "/api/admin/rfqs/meta", "/api/admin/rfqs/export", "/api/admin/rfq-analytics", "/api/admin/certifications"]) {
    assert.equal((await get(path)).status, 401, path);
  }
});

// --- Admin pipeline ---------------------------------------------------------

test("GET /api/admin/rfqs returns the pipeline with labels and totals", async () => {
  const response = await get("/api/admin/rfqs?limit=5", admin);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.rfqs));
  assert.ok(body.total >= 1);
  assert.equal(body.limit, 5);
  assert.equal(body.rfqs[0].volumeTierLabel.length > 0, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("admin list search escapes regex metacharacters instead of building a pattern", async () => {
  const response = await get(`/api/admin/rfqs?search=${encodeURIComponent(".*")}`, admin);
  assert.equal(response.status, 200, "a regex payload must not crash the route");
});

test("status, assignment and notes endpoints validate and persist", async () => {
  const created = await (await post("/api/rfqs", { ...validBody(), workEmail: "flow@acme.in", companyName: "Flow Co" })).json();
  const id = models.Rfq.rows.find((row) => row.rfqReferenceId === created.rfq.rfqReferenceId)._id;

  assert.equal((await patch(`/api/admin/rfqs/${id}/status`, { status: "archived" }, admin)).status, 400);
  const statusResponse = await patch(`/api/admin/rfqs/${id}/status`, { status: "quotation_sent" }, admin);
  assert.equal(statusResponse.status, 200);
  assert.equal((await statusResponse.json()).rfq.status, "quotation_sent");

  const assignResponse = await patch(`/api/admin/rfqs/${id}/assign`, { assignedTo: "KAM Utility", followUpDate: "2026-04-01" }, admin);
  assert.equal(assignResponse.status, 200);
  assert.equal((await assignResponse.json()).rfq.assignedTo, "KAM Utility");

  assert.equal((await patch(`/api/admin/rfqs/${id}/assign`, { followUpDate: "not-a-date" }, admin)).status, 400);
  assert.equal((await post(`/api/admin/rfqs/${id}/notes`, { note: "" }, admin)).status, 400);
  const noteResponse = await post(`/api/admin/rfqs/${id}/notes`, { note: "Called procurement head." }, admin);
  assert.equal(noteResponse.status, 201);
  assert.match((await noteResponse.json()).rfq.internalRemarks, /Called procurement head\./);

  assert.equal((await patch("/api/admin/rfqs/does-not-exist/status", { status: "won" }, admin)).status, 404);
});

test("GET /api/admin/rfqs/:id returns the record with activity history", async () => {
  const row = models.Rfq.rows[0];
  const response = await get(`/api/admin/rfqs/${row._id}`, admin);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.rfq.id, row._id);
  assert.ok(Array.isArray(body.events));
  assert.equal((await get("/api/admin/rfqs/nope", admin)).status, 404);
});

test("CSV export is served as a download with escaped cells", async () => {
  const response = await get("/api/admin/rfqs/export", admin);
  const csv = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/csv/);
  assert.match(response.headers.get("content-disposition"), /attachment; filename="solarious-rfqs-\d{4}-\d{2}-\d{2}\.csv"/);
  assert.match(csv.split("\r\n")[0], /"RFQ Reference","Submitted \(IST\)","Company"/);
  assert.ok(csv.split("\r\n").length >= 2);
});

test("notifications can be retried from the admin panel", async () => {
  webhookFailures = true;
  const created = await (await post("/api/rfqs", { ...validBody(), workEmail: "retry@acme.in", companyName: "Retry Co" })).json();
  const id = models.Rfq.rows.find((row) => row.rfqReferenceId === created.rfq.rfqReferenceId)._id;
  webhookFailures = false;
  const response = await post(`/api/admin/rfqs/${id}/notifications/retry`, {}, admin);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.notifications.webhook.status, "sent");
});

test("analytics summarises statuses and exposes notification configuration", async () => {
  const response = await get("/api/admin/rfq-analytics", admin);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.total >= 1);
  assert.equal(typeof body.byStatus.new, "number");
  assert.ok(body.notifications.emailConfigured);
});

// --- Certifications ---------------------------------------------------------

const verifiedCert = () => ({
  code: "BIS-14286",
  name: "BIS Registration — IS 14286",
  category: "bis",
  standards: ["IS 14286"],
  scope: "Crystalline silicon modules",
  verificationStatus: "verified",
  documentResourceId: "6512a1f4c2b3d4e5f6071829",
  certificateNumber: "BIS-SECRET-1",
  published: true,
});

test("POST /api/admin/certifications validates and rejects unverifiable claims", async () => {
  const noDocument = await post("/api/admin/certifications", { ...verifiedCert(), documentResourceId: "" }, admin);
  const noDocumentBody = await noDocument.json();
  assert.equal(noDocument.status, 400);
  assert.ok(noDocumentBody.fields.verificationStatus);

  const badCategory = await post("/api/admin/certifications", { ...verifiedCert(), category: "nope" }, admin);
  assert.equal(badCategory.status, 400);

  const created = await post("/api/admin/certifications", verifiedCert(), admin);
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.equal(body.certification.public.verified, true);
  assert.equal(body.certification.public.certificateNumber, "BIS-SECRET-1");
});

test("the public registry hides certificate numbers for unverified records", async () => {
  await post(
    "/api/admin/certifications",
    { ...verifiedCert(), name: "IEC 61215 pending", category: "iec", standards: ["IEC 61215"], verificationStatus: "pending", certificateNumber: "IEC-SECRET-9", published: true },
    admin,
  );
  const response = await get("/api/certifications");
  const body = await response.json();
  assert.equal(response.status, 200);
  const flat = body.categories.flatMap((category) => category.records);
  const pending = flat.find((record) => record.name === "IEC 61215 pending");
  assert.equal(pending.verified, false);
  assert.equal(pending.certificateNumber, "");
  assert.equal(pending.documentUrl, "");
  assert.ok(flat.some((record) => record.verified), "verified records remain visible");
  assert.equal(body.stats.total >= 2, true);
});

test("certification updates and deletes respect existence and validation", async () => {
  const row = models.Certification.rows[0];
  const updated = await fetch(`${baseUrl}/api/admin/certifications/${row._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...admin },
    body: JSON.stringify({ ...verifiedCert(), name: "BIS Registration (updated)" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).certification.name, "BIS Registration (updated)");

  const missing = await fetch(`${baseUrl}/api/admin/certifications/does-not-exist`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...admin },
    body: JSON.stringify(verifiedCert()),
  });
  assert.equal(missing.status, 404);

  const deleted = await fetch(`${baseUrl}/api/admin/certifications/${row._id}`, { method: "DELETE", headers: admin });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(`${baseUrl}/api/admin/certifications/${row._id}`, { method: "DELETE", headers: admin })).status, 404);
});
