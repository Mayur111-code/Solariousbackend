import assert from "node:assert/strict";
import test from "node:test";
import { allocateReference, createRfq, deliverRfqNotifications, retryPendingRfqs, setRfqStatus } from "./rfq-workflow.mjs";

// --- Minimal in-memory stand-ins for the Mongoose models --------------------

const setPath = (target, path, value) => {
  const keys = path.split(".");
  let cursor = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
};

const matches = (row, query = {}) =>
  Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((clause) => matches(row, clause));
    const actual = key.split(".").reduce((value, part) => (value == null ? value : value[part]), row);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("$gt" in expected) return actual > expected.$gt;
      if ("$ne" in expected) return actual !== expected.$ne;
      if ("$nin" in expected) return !expected.$nin.includes(actual);
    }
    return actual === expected;
  });

function fakeRfqModel(seed = []) {
  const rows = seed.map((row, index) => ({
    _id: `rfq-${index + 1}`,
    status: "new",
    createdAt: new Date(Date.now() - 60_000),
    notifications: {
      customer: { status: "pending", attempts: 0 },
      internal: { status: "pending", attempts: 0 },
      webhook: { status: "pending", attempts: 0 },
    },
    ...row,
  }));
  const model = {
    rows,
    findOne(query) {
      const found = rows.find((row) => matches(row, query));
      return { lean: async () => (found ? { ...found } : null) };
    },
    async create(doc) {
      const row = {
        _id: `rfq-${rows.length + 1}`,
        status: "new",
        createdAt: new Date(),
        notifications: {
          customer: { status: "pending", attempts: 0 },
          internal: { status: "pending", attempts: 0 },
          webhook: { status: "pending", attempts: 0 },
        },
        ...doc,
      };
      rows.push(row);
      return { ...row, toObject: () => ({ ...row }) };
    },
    find(query) {
      const results = rows.filter((row) => matches(row, query)).map((row) => ({ ...row }));
      return {
        sort: () => ({ limit: async () => results, lean: async () => results }),
        limit: async () => results,
        lean: async () => results,
      };
    },
    async updateOne(query, update) {
      const row = rows.find((candidate) => matches(candidate, query));
      if (!row) return { modifiedCount: 0 };
      for (const [path, value] of Object.entries(update.$set || {})) setPath(row, path, value);
      return { modifiedCount: 1 };
    },
    async findByIdAndUpdate(id, update) {
      const row = rows.find((candidate) => candidate._id === id);
      if (!row) return null;
      Object.assign(row, update);
      return { ...row, toObject: () => ({ ...row }) };
    },
  };
  return model;
}

function fakeCounter(initial = 0) {
  return {
    value: initial,
    findOneAndUpdate() {
      this.value += 1;
      const sequence = this.value;
      return { lean: async () => ({ sequence }) };
    },
  };
}

const basePayload = () => ({
  fullName: "Rahul Mehta",
  workEmail: "rahul@brightfuturepower.in",
  phone: "+919812345678",
  companyName: "Bright Future Power",
  projectType: "ci-rooftop",
  volumeTier: "500kw-1mw",
  moduleTechnology: "bifacial-dual-glass",
  dispatchTimeline: "immediate",
  targetLocation: { country: "India", state: "Gujarat", city: "Ahmedabad", site: "" },
  privacyConsent: true,
});

const harness = ({ emails = [], webhooks = [], failCustomer = false, products = [] } = {}) => {
  const sent = emails;
  const hooks = webhooks;
  return {
    deps: {
      Rfq: fakeRfqModel(),
      RfqCounter: fakeCounter(0),
      RfqEvent: { create: async () => ({}) },
      Product: { find: () => ({ lean: async () => products }) },
      config: {
        salesInbox: ["sales-leads@solariousenergy.com"],
        highPriorityInbox: ["kam-utility@solariousenergy.com"],
        salesActions: [],
        webhookConfigured: true,
      },
      sendEmail: async (message) => {
        sent.push(message);
        if (failCustomer && message.to === basePayload().workEmail) return { sent: false, error: "SMTP_SEND_FAILED" };
        return { sent: true, provider: "smtp", messageId: `msg-${sent.length}` };
      },
      sendWebhook: async (payload) => {
        hooks.push(payload);
        return { sent: true, status: 200 };
      },
    },
    sent,
    hooks,
  };
};

// --- Reference allocation ---------------------------------------------------

test("references increment per year and never repeat", async () => {
  const counter = fakeCounter(41);
  const first = await allocateReference({ RfqCounter: counter, year: 2026 });
  const second = await allocateReference({ RfqCounter: counter, year: 2026 });
  assert.equal(first.reference, "SOL-RFQ-2026-000042");
  assert.equal(second.reference, "SOL-RFQ-2026-000043");
  assert.notEqual(first.reference, second.reference);
});

test("reference allocation retries a transient counter failure", async () => {
  let calls = 0;
  const flaky = {
    findOneAndUpdate() {
      calls += 1;
      if (calls === 1) throw new Error("transient failure");
      return { lean: async () => ({ sequence: 7 }) };
    },
  };
  const result = await allocateReference({ RfqCounter: flaky, year: 2026 });
  assert.equal(result.reference, "SOL-RFQ-2026-000007");
  assert.equal(calls, 2);
});

// --- Creation ---------------------------------------------------------------

test("a valid RFQ is persisted with a backend-generated reference and Normal priority", async () => {
  const { deps, sent, hooks } = harness();
  const result = await createRfq({ body: basePayload(), year: 2026 }, deps);
  assert.equal(result.status, 201);
  assert.equal(result.body.rfq.rfqReferenceId, "SOL-RFQ-2026-000001");
  assert.equal(result.body.rfq.priority, "Medium");
  assert.equal(result.body.rfq.status, "new");
  assert.equal(deps.Rfq.rows.length, 1);
  // Customer confirmation + internal desk notice, no high-priority webhook below 1 MW.
  assert.equal(sent.length, 2);
  assert.equal(hooks.length, 0);
  assert.equal(deps.Rfq.rows[0].notifications.customer.status, "sent");
});

test("invalid submissions are rejected before any record or email is created", async () => {
  const { deps, sent } = harness();
  await assert.rejects(
    () => createRfq({ body: { ...basePayload(), workEmail: "bad", privacyConsent: false }, year: 2026 }, deps),
    (error) => error.code === "VALIDATION_ERROR" && Boolean(error.fields.workEmail) && Boolean(error.fields.privacyConsent),
  );
  assert.equal(deps.Rfq.rows.length, 0);
  assert.equal(sent.length, 0);
});

test("repeated idempotency keys return the original RFQ instead of creating a duplicate", async () => {
  const { deps, sent } = harness();
  const first = await createRfq({ body: basePayload(), submissionKey: "key-123", year: 2026 }, deps);
  const second = await createRfq({ body: basePayload(), submissionKey: "key-123", year: 2026 }, deps);
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(second.body.rfq.rfqReferenceId, first.body.rfq.rfqReferenceId);
  assert.equal(deps.Rfq.rows.length, 1);
  assert.equal(sent.length, 2, "duplicate submissions must not re-send email");
});

test("a repeat submission inside the dedupe window is treated as a duplicate", async () => {
  const { deps } = harness();
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  const again = await createRfq({ body: basePayload(), year: 2026 }, deps);
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.match(again.body.notice, /already received/);
  assert.equal(deps.Rfq.rows.length, 1);
});

test("submissions outside the dedupe window create a new RFQ", async () => {
  const { deps } = harness();
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  deps.Rfq.rows[0].createdAt = new Date(Date.now() - 11 * 60 * 1000);
  const again = await createRfq({ body: basePayload(), year: 2026 }, deps);
  assert.equal(again.status, 201);
  assert.equal(deps.Rfq.rows.length, 2);
});

// --- High-priority alerting (spec test cases 1-5) ---------------------------

test("RFQs of 1 MW and above escalate to the high-priority inbox and webhook", async () => {
  for (const [tier, priority] of [
    ["1mw-5mw", "High"],
    ["5mw-25mw", "High"],
    ["25mw-plus", "High"],
  ]) {
    const { deps, sent, hooks } = harness();
    const result = await createRfq({ body: { ...basePayload(), volumeTier: tier }, year: 2026 }, deps);
    assert.equal(result.body.rfq.priority, priority, tier);
    const internal = sent.find((message) => message.to.includes("kam-utility@solariousenergy.com"));
    assert.ok(internal, `${tier} must reach the high-priority inbox`);
    assert.match(internal.subject, /^HIGH-PRIORITY RFQ \(≥ 1 MW\)/);
    assert.ok(internal.to.includes("sales-leads@solariousenergy.com"), "sales inbox stays informed");
    assert.equal(hooks.length, 1, `${tier} must post one webhook alert`);
    assert.match(hooks[0].text, /HIGH-PRIORITY LEAD/);
    assert.equal(deps.Rfq.rows[0].notifications.webhook.status, "sent");
  }
});

test("RFQs below 1 MW never page the high-priority inbox or webhook", async () => {
  for (const tier of ["under-100kw", "100kw-500kw", "500kw-1mw"]) {
    const { deps, sent, hooks } = harness();
    const result = await createRfq({ body: { ...basePayload(), volumeTier: tier }, year: 2026 }, deps);
    assert.notEqual(result.body.rfq.priority, "High", tier);
    assert.equal(sent.filter((message) => message.to.includes("kam-utility@solariousenergy.com")).length, 0, tier);
    assert.equal(sent.filter((message) => message.to.includes("sales-leads@solariousenergy.com")).length, 1, tier);
    assert.equal(hooks.length, 0, tier);
  }
});

// --- Delivery failure isolation --------------------------------------------

test("an email outage never loses the RFQ and is recorded for retry", async () => {
  const { deps } = harness({ failCustomer: true });
  const result = await createRfq({ body: basePayload(), year: 2025 }, deps);
  assert.equal(result.status, 201);
  assert.equal(deps.Rfq.rows.length, 1, "the RFQ is still saved");
  assert.equal(deps.Rfq.rows[0].notifications.customer.status, "failed");
  assert.equal(deps.Rfq.rows[0].notifications.customer.attempts, 1);
  assert.equal(deps.Rfq.rows[0].notifications.internal.status, "sent", "internal notice still attempted independently");
});

test("a webhook failure is recorded but does not fail the submission", async () => {
  const { deps } = harness();
  deps.sendWebhook = async () => ({ sent: false, error: "WEBHOOK_TIMEOUT" });
  const result = await createRfq({ body: { ...basePayload(), volumeTier: "25mw-plus" }, year: 2026 }, deps);
  assert.equal(result.status, 201);
  assert.equal(deps.Rfq.rows[0].notifications.webhook.status, "failed");
  assert.equal(deps.Rfq.rows[0].notifications.webhook.lastError, "WEBHOOK_TIMEOUT");
});

test("unconfigured email is recorded as not_configured rather than failed", async () => {
  const { deps } = harness();
  deps.sendEmail = async () => ({ sent: false, skipped: true, reason: "not_configured" });
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  assert.equal(deps.Rfq.rows[0].notifications.customer.status, "not_configured");
  assert.equal(deps.Rfq.rows[0].notifications.customer.lastError, "not_configured");
});

test("retry sweep re-sends only failed notifications and respects the attempt cap", async () => {
  const { deps, sent } = harness({ failCustomer: true });
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  assert.equal(deps.Rfq.rows[0].notifications.customer.status, "failed");

  deps.sendEmail = async (message) => {
    sent.push(message);
    return { sent: true, provider: "smtp" };
  };
  const first = await retryPendingRfqs(deps);
  assert.equal(first.retried, 1);
  assert.equal(deps.Rfq.rows[0].notifications.customer.status, "sent");
  assert.equal(deps.Rfq.rows[0].notifications.customer.attempts, 2);

  const second = await retryPendingRfqs(deps);
  assert.equal(second.retried, 0, "nothing left to retry once delivered");
});

test("retry sweep stops at the maximum attempt count", async () => {
  const { deps } = harness({ failCustomer: true });
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  deps.Rfq.rows[0].notifications.customer.attempts = 5;
  const result = await retryPendingRfqs(deps);
  assert.equal(result.retried, 0);
});

// --- Matching datasheets ----------------------------------------------------

test("a matching published datasheet is attached to the confirmation email", async () => {
  const { deps, sent } = harness({
    products: [
      {
        name: "Solarious Bifacial Dual-Glass",
        slug: "bifacial",
        technology: "Bifacial Dual-Glass",
        datasheetUrl: "https://res.cloudinary.com/solarious/bifacial.pdf",
        published: true,
      },
    ],
  });
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  const customer = sent.find((message) => message.to === basePayload().workEmail);
  assert.ok(customer.attachments?.[0]?.path.endsWith("bifacial.pdf"));
});

// --- Status transition ------------------------------------------------------

test("status transitions are validated and recorded", async () => {
  const { deps } = harness();
  await createRfq({ body: basePayload(), year: 2026 }, deps);
  const id = deps.Rfq.rows[0]._id;

  const invalid = await setRfqStatus(deps, id, { status: "archived" });
  assert.equal(invalid.status, 400);

  const valid = await setRfqStatus(deps, id, { status: "quotation_sent" });
  assert.equal(valid.status, 200);
  assert.equal(deps.Rfq.rows[0].status, "quotation_sent");

  const missing = await setRfqStatus(deps, "does-not-exist", { status: "won" });
  assert.equal(missing.status, 404);
});
