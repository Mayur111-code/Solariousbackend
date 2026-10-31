import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The RFQ form posts ids that backend/services/rfq.mjs must accept. These tests
// fail loudly if either side drifts.
async function optionIds(file, name) {
  const source = await read(file);
  const match = new RegExp(`export const ${name}[^=]*=\\s*(?:Object\\.freeze\\()?\\[([\\s\\S]*?)\\n\\]`, "m").exec(source);
  assert.ok(match, `${name} not found in ${file}`);
  return [...match[1].matchAll(/id:\s*"([^"]+)"/g)].map((entry) => entry[1]);
}

test("RFQ option ids match between the client form and the API validator", async () => {
  for (const [clientName, serverName] of [
    ["RFQ_PROJECT_TYPES", "PROJECT_TYPES"],
    ["RFQ_VOLUME_TIERS", "VOLUME_TIERS"],
    ["RFQ_MODULE_TECHNOLOGIES", "MODULE_TECHNOLOGIES"],
    ["RFQ_DISPATCH_TIMELINES", "DISPATCH_TIMELINES"],
  ]) {
    const client = await optionIds("lib/rfq-options.ts", clientName);
    const server = await optionIds("backend/services/rfq.mjs", serverName);
    assert.ok(client.length, `${clientName} is empty`);
    assert.deepEqual(client, server, `${clientName} must match ${serverName}`);
  }
});

test("the client mirrors the high-priority tier set used for escalation", async () => {
  const server = await optionIds("backend/services/rfq.mjs", "VOLUME_TIERS");
  const source = await read("backend/services/rfq.mjs");
  const high = [...source.matchAll(/id: "([^"]+)", label: "[^"]+", minKw: (\d+), maxKw: [^,]+, priority: "High"/g)].map((entry) => entry[1]);
  assert.deepEqual(high.sort(), ["1mw-5mw", "25mw-plus", "5mw-25mw"].sort());
  assert.ok(server.includes("500kw-1mw"), "the medium tier must exist");

  const client = await read("lib/rfq-options.ts");
  for (const tier of high) assert.match(client, new RegExp(`"${tier}"`), `client is missing ${tier} in HIGH_PRIORITY_TIERS`);
});

test("the quote page renders the RFQ wizard and submits to the RFQ endpoint", async () => {
  const [page, wizard] = await Promise.all([read("app/quote/page.tsx"), read("components/rfq-wizard.tsx")]);
  assert.match(page, /RfqWizard/);
  assert.doesNotMatch(page, /QuoteWizard/, "the legacy free-text wizard must not be used for procurement");
  assert.match(wizard, /fetch\("\/api\/rfqs"/);
  assert.match(wizard, /Idempotency-Key/);
  assert.match(wizard, /privacyConsent/);
});

test("RFQ API routes exist for submission, admin pipeline and export", async () => {
  const [server, source] = await Promise.all([read("backend/server.mjs"), read("backend/routes/procurement-routes.mjs")]);
  assert.match(server, /registerProcurementRoutes\(app/, "server.mjs must mount the procurement router");
  // Normalise formatted route declarations so the assertions stay readable.
  const routes = source.replace(/app\.(get|post|patch|put|delete)\(\s*/g, (_match, verb) => `app.${verb}(`);
  for (const route of [
    'app.post("/api/rfqs"',
    'app.get("/api/admin/rfqs"',
    'app.get("/api/admin/rfqs/export"',
    'app.get("/api/admin/rfqs/:id"',
    'app.patch("/api/admin/rfqs/:id/status"',
    'app.patch("/api/admin/rfqs/:id/assign"',
    'app.post("/api/admin/rfqs/:id/notes"',
    'app.get("/api/admin/rfq-analytics"',
  ]) {
    assert.ok(routes.includes(route), `missing ${route}`);
  }
  // The CSV route must be registered before the :id route or it is shadowed.
  assert.ok(
    routes.indexOf('app.get("/api/admin/rfqs/export"') < routes.indexOf('app.get("/api/admin/rfqs/:id"'),
    "the export route must be declared before /api/admin/rfqs/:id",
  );
});

test("public RFQ submission is rate limited and never exposes internal fields", async () => {
  const routes = await read("backend/routes/procurement-routes.mjs");
  assert.match(routes, /app\.post\(\s*"\/api\/rfqs",\s*rfqRateLimit/);
  const workflow = await read("backend/services/rfq-workflow.mjs");
  const summary = workflow.slice(workflow.indexOf("function publicSummary"), workflow.indexOf("/** Retry undelivered"));
  for (const internal of ["internalRemarks", "assignedTo", "followUpDate", "sourceIpHash", "submissionKey"]) {
    assert.ok(!summary.includes(internal), `public RFQ summary must not include ${internal}`);
  }
});

test("admin RFQ endpoints are protected by the admin cookie middleware", async () => {
  const routes = await read("backend/routes/procurement-routes.mjs");
  const adminRoutes = [...routes.matchAll(/app\.(?:get|post|patch|put|delete)\(\s*"(\/api\/admin\/rfqs[^"]*)",\s*admin/g)].map((entry) => entry[1]);
  assert.ok(adminRoutes.length >= 6, `expected all RFQ admin routes to be admin-guarded, found ${adminRoutes.length}`);
  for (const path of ["/api/admin/rfq-analytics", "/api/admin/certifications"]) {
    assert.ok(new RegExp(`app\\.(?:get|post|put|delete)\\(\\s*"${path}"[^)]*,\\s*admin`).test(routes), `${path} must be admin-guarded`);
  }
});

test("the certifications page and admin panel render verification status", async () => {
  const [page, admin, registry] = await Promise.all([
    read("app/certifications/page.tsx"),
    read("components/admin-certifications.tsx"),
    read("backend/services/certifications.mjs"),
  ]);
  assert.match(page, /Verified/);
  assert.match(page, /Documentation pending/);
  assert.match(admin, /Only records marked verified with a linked certificate document/);
  // Unverified records must never publish a certificate number or document link.
  assert.match(registry, /certificateNumber: verified \? record\.certificateNumber \|\| "" : ""/);
  assert.match(registry, /documentUrl: verified && record\.documentResourceId/);
});
