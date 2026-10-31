import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityReport, csvCell } from "./weekly-report.mjs";

const start = new Date("2026-01-01T18:30:00.000Z"); // 02 Jan 2026, 00:00 IST
const end = new Date("2026-01-08T18:30:00.000Z"); // 09 Jan 2026, 00:00 IST
const company = {
  brand: "Solarious Energy",
  legalName: "Mayureshwar Solar Energy Pvt Ltd",
  email: "info@solariousenergy.in",
  phone: "+91 90000 00000",
  website: "https://www.solariousenergy.in",
  address: "MIDC Nardana, Dhule",
};

const enquiries = [
  {
    kind: "contact",
    name: "Asha Patil",
    company: "Patil Textiles",
    phone: "9876543210",
    email: "asha@example.com",
    product: "TOPCon",
    message: "Rooftop requirement",
    status: "new",
    createdAt: start,
  },
  {
    kind: "quote",
    name: "Rahul Deshmukh",
    phone: "9876500000",
    email: "rahul@example.com",
    capacity: "1.2 MW",
    message: "Utility scale",
    status: "qualified",
    createdAt: start,
  },
  {
    kind: "ai_assistant",
    name: "Neha Joshi",
    phone: "9876511111",
    email: "neha@example.com",
    message: "Bill reduction",
    status: "closed",
    createdAt: start,
  },
  {
    kind: "contact",
    name: "Old Case",
    phone: "9876522222",
    email: "old@example.com",
    message: "Follow-up",
    status: "contacted",
    createdAt: start,
  },
];

test("subject uses the required business-activity wording and an en dash", () => {
  const report = buildActivityReport({ enquiries, start, end, company });
  assert.equal(
    report.subject,
    "Solarious Energy – Weekly Business Activity Report | 02 Jan 2026 – 09 Jan 2026",
  );
  assert.equal(report.periodLabel, "02 Jan 2026 – 09 Jan 2026");
});

test("counts separate sources, pending work and resolutions", () => {
  const { counts } = buildActivityReport({ enquiries, start, end, company });
  assert.equal(counts.totalEnquiries, 4);
  assert.equal(counts.contact, 2);
  assert.equal(counts.quote, 1);
  assert.equal(counts.product, 1);
  assert.equal(counts.project, 1); // quote requests and capacity-bearing enquiries
  assert.equal(counts.newLeads, 1);
  assert.equal(counts.pending, 2);
  assert.equal(counts.resolved, 1);
  assert.equal(counts.inProgress, 1);
});

test("creative and document activity is summarised separately from generation failures", () => {
  const creatives = [
    { status: "completed", reviewStatus: "pending", headline: "Rooftop", campaignType: "Residential Solar" },
    { status: "completed", reviewStatus: "approved", headline: "Factory", campaignType: "Industrial Solar" },
    { status: "failed", failureCode: "PROVIDER_TIMEOUT", headline: "Attempt" },
  ];
  const { counts, html } = buildActivityReport({
    enquiries,
    creatives,
    resources: [{ title: "IEC certificate pack" }, { title: "Warranty terms" }],
    adminActivity: [{ action: "product.update", actor: "admin" }],
    start,
    end,
    company,
  });
  assert.equal(counts.creativesGenerated, 2);
  assert.equal(counts.creativeFailures, 1);
  assert.equal(counts.creativesAwaitingReview, 1);
  assert.equal(counts.documentsUploaded, 2);
  assert.equal(counts.adminActions, 1);
  assert.match(html, /AI creative activity/);
  assert.match(html, /IEC certificate pack/);
});

test("an empty period still sends a complete report with an explicit message", () => {
  const { counts, html, subject } = buildActivityReport({ start, end, company });
  assert.equal(counts.totalActivity, 0);
  assert.match(html, /No new activity was recorded during this reporting period/);
  assert.match(html, /Business Activity Report/);
  assert.match(subject, /Weekly Business Activity Report/);
});

test("customer-supplied text is escaped and never injects markup", () => {
  const hostile = [
    {
      ...enquiries[0],
      name: '<script>alert("x")</script>',
      message: "<img src=x onerror=alert(1)>",
    },
  ];
  const { html } = buildActivityReport({ enquiries: hostile, start, end, company });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.match(html, /&lt;script&gt;/);
});

test("the email never renders credentials or provider secrets", () => {
  const { html } = buildActivityReport({
    enquiries: [{ ...enquiries[0], apiKey: "sk-live-secret", password: "hunter2" }],
    start,
    end,
    company: { ...company, apiKey: "sk-live-secret" },
  });
  assert.ok(!html.includes("sk-live-secret"));
  assert.ok(!html.includes("hunter2"));
  assert.ok(!/bearer\s+[a-z0-9]/i.test(html));
});

test("only pending statuses reach the pending follow-up table", () => {
  const { html } = buildActivityReport({ enquiries, start, end, company });
  const pendingBlock = html.split("Pending enquiries")[1]?.split("AI creative activity")[0] || "";
  assert.match(pendingBlock, /Asha Patil/);
  assert.match(pendingBlock, /Rahul Deshmukh/);
  assert.ok(!pendingBlock.includes("Old Case"), "contacted enquiries are not pending");
  assert.ok(!pendingBlock.includes("Neha Joshi"), "closed enquiries are not pending");
});

test("CSV cells neutralise spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1:A2)"), '"\'=SUM(A1:A2)"');
  assert.equal(csvCell('Acme, "Solar"'), '"Acme, ""Solar"""');
});
