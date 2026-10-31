import assert from "node:assert/strict";
import test from "node:test";
import {
  MODULE_TECHNOLOGIES,
  VOLUME_TIERS,
  buildRfqCsv,
  classifyPriority,
  csvCell,
  datasheetForTechnology,
  dispatchTimelineLabel,
  formatIst,
  formatReference,
  highPriorityWebhookPayload,
  isConsumerEmail,
  isHighPriority,
  isReference,
  locationLabel,
  moduleTechnologyLabel,
  parseReference,
  projectTypeLabel,
  rfqConfirmationEmail,
  rfqInternalNoticeEmail,
  rfqPriorityAlertEmail,
  tierLabel,
  validateRfq,
  volumeTier,
} from "./rfq.mjs";

const validPayload = () => ({
  fullName: "Anita Deshmukh",
  workEmail: "anita@acmesolar.in",
  phone: "+91 98765 43210",
  companyName: "Acme Solar EPC Pvt Ltd",
  gstin: "27AAPFU0939F1ZV",
  designation: "Head of Procurement",
  projectType: "utility-tender",
  volumeTier: "1mw-5mw",
  moduleTechnology: "n-type-topcon",
  dispatchTimeline: "60-90-days",
  targetLocation: { country: "India", state: "Maharashtra", city: "Nashik", site: "Satpur MIDC" },
  specificationRequirements: "1500V DC compatible\nFrame 2382 × 1134 × 35 mm",
  privacyConsent: true,
});

// --- References -------------------------------------------------------------

test("RFQ references are zero-padded, parseable and year-scoped", () => {
  assert.equal(formatReference(2026, 1), "SOL-RFQ-2026-000001");
  assert.equal(formatReference(2026, 123456), "SOL-RFQ-2026-123456");
  assert.deepEqual(parseReference("SOL-RFQ-2026-000042"), { year: 2026, sequence: 42 });
  assert.equal(parseReference("SOL-RFQ-2026"), null);
  assert.equal(parseReference("2026-000042"), null);
  assert.equal(isReference("sol-rfq-2026-000042"), true);
  assert.equal(isReference("SOL-RFQ-26-1"), false);
  assert.throws(() => formatReference(2026, 0), /positive integer/);
  assert.throws(() => formatReference(1999, 1), /year is invalid/);
});

// --- Priority classification (spec test cases 1-5) --------------------------

test("priority follows the capacity tier table exactly", () => {
  const expected = {
    "under-100kw": "Normal", // case 1
    "100kw-500kw": "Normal",
    "500kw-1mw": "Medium", // case 2
    "1mw-5mw": "High", // case 3
    "5mw-25mw": "High", // case 4
    "25mw-plus": "High", // case 5
  };
  for (const [tier, priority] of Object.entries(expected)) {
    assert.equal(classifyPriority(tier), priority, tier);
  }
  assert.equal(classifyPriority("not-a-tier"), "Normal");
});

test("only tiers at or above 1 MW raise a high-priority alert", () => {
  assert.equal(isHighPriority("500kw-1mw"), false);
  assert.equal(isHighPriority("1mw-5mw"), true);
  assert.equal(isHighPriority("5mw-25mw"), true);
  assert.equal(isHighPriority("25mw-plus"), true);
  assert.equal(isHighPriority("unknown"), false);
  assert.equal(volumeTier("1mw-5mw").minKw, 1000);
  assert.equal(volumeTier("25mw-plus").maxKw, Infinity);
});

test("every tier declares a recognised priority and a human label", () => {
  assert.equal(VOLUME_TIERS.length, 6);
  for (const tier of VOLUME_TIERS) {
    assert.ok(["Normal", "Medium", "High"].includes(tier.priority), tier.id);
    assert.ok(tier.label.length > 3, tier.id);
  }
  assert.equal(tierLabel("5mw-25mw"), "5 MW – 25 MW");
  assert.equal(projectTypeLabel("ci-rooftop"), "C&I Rooftop");
  assert.equal(moduleTechnologyLabel("hjt"), "HJT Heterojunction");
  assert.equal(dispatchTimelineLabel("immediate"), "Immediate (<30 Days)");
  assert.equal(MODULE_TECHNOLOGIES.length, 4);
});

// --- Validation (spec test cases 6, 7, 8) -----------------------------------

test("a complete RFQ validates and derives priority server-side", () => {
  const result = validateRfq(validPayload());
  assert.deepEqual(result.errors, {});
  assert.equal(result.priority, "High");
  assert.equal(result.highPriority, true);
  assert.equal(result.values.workEmail, "anita@acmesolar.in");
  assert.equal(validateRfq({ ...validPayload(), workEmail: "ANITA@ACMeSolar.IN" }).values.workEmail, "anita@acmesolar.in", "emails are normalised to lower case");
  assert.equal(result.values.phone, "+919876543210");
  assert.equal(result.values.gstin, "27AAPFU0939F1ZV");
});

test("invalid, missing and unsafe email addresses are rejected", () => {
  for (const workEmail of ["not-an-email", "a@b", "user@domain.", "@acme.in", "", "user@@acme.in", "user@acme .in"]) {
    const { errors } = validateRfq({ ...validPayload(), workEmail });
    assert.ok(errors.workEmail, `expected rejection for ${JSON.stringify(workEmail)}`);
  }
});

test("phone numbers outside 7-15 digits are rejected", () => {
  for (const phone of ["12345", "abcdefghij", "+91 98765 43210123456", ""]) {
    const { errors } = validateRfq({ ...validPayload(), phone });
    assert.ok(errors.phone, `expected rejection for ${JSON.stringify(phone)}`);
  }
  assert.equal(validateRfq({ ...validPayload(), phone: "9876543210" }).errors.phone, undefined);
  assert.equal(validateRfq({ ...validPayload(), phone: "+44 7700 900123" }).errors.phone, undefined);
});

test("missing required fields and missing consent are reported per field", () => {
  const { errors } = validateRfq({});
  for (const field of ["fullName", "workEmail", "phone", "companyName", "projectType", "volumeTier", "moduleTechnology", "dispatchTimeline", "country", "state", "city", "privacyConsent"]) {
    assert.ok(errors[field], `expected an error for ${field}`);
  }
});

test("invalid GSTIN, tier and technology values are rejected", () => {
  const { errors } = validateRfq({ ...validPayload(), gstin: "ABC123", volumeTier: "10mw", moduleTechnology: "perovskite", projectType: "mars" });
  assert.ok(errors.gstin);
  assert.ok(errors.volumeTier);
  assert.ok(errors.moduleTechnology);
  assert.ok(errors.projectType);
  assert.equal(validateRfq({ ...validPayload(), gstin: "" }).errors.gstin, undefined, "GSTIN stays optional");
});

test("submitted strings are length-capped and control characters removed", () => {
  const { values } = validateRfq({
    ...validPayload(),
    fullName: `  ${"A".repeat(400)}  `,
    specificationRequirements: `Line one\n\n\n\nLine two\u0007`,
    companyName: "Acme\u0000Solar",
  });
  assert.equal(values.fullName.length, 120);
  assert.equal(values.companyName, "Acme Solar");
  assert.ok(!values.specificationRequirements.includes("\u0007"));
});

test("consumer mailboxes are detectable so the desk can qualify the lead", () => {
  assert.equal(isConsumerEmail("someone@gmail.com"), true);
  assert.equal(isConsumerEmail("buyer@acmesolar.in"), false);
});

test("location and IST formatting are stable for email and export", () => {
  assert.equal(locationLabel({ city: "Nashik", state: "Maharashtra", country: "India" }), "Nashik, Maharashtra, India");
  assert.equal(formatIst("2026-03-01T04:30:00.000Z"), "1 Mar 2026, 10:00 am IST");
});

// --- Email templates --------------------------------------------------------

test("customer confirmation carries the reference, labels and only a real datasheet", () => {
  const { values } = validateRfq(validPayload());
  const rfq = { ...values, rfqReferenceId: "SOL-RFQ-2026-000007", priority: "High", createdAt: new Date("2026-03-01T04:30:00Z") };
  const message = rfqConfirmationEmail({ rfq });
  assert.match(message.subject, /Ref #SOL-RFQ-2026-000007 \(Acme Solar EPC Pvt Ltd\)/);
  assert.match(message.text, /N-Type TOPCon/);
  assert.match(message.text, /1 MW – 5 MW/);
  assert.match(message.text, /Nashik, Maharashtra, India/);
  assert.match(message.text, /24 business hours/);
  assert.ok(!message.html.includes("<script"), "html must be escaped");
  assert.ok(!/datasheet:/.test(message.text), "no datasheet when none matches");

  const withDatasheet = rfqConfirmationEmail({
    rfq,
    datasheet: { title: "TOPCon datasheet", url: "https://res.cloudinary.com/x/topcon.pdf" },
  });
  assert.match(withDatasheet.html, /topcon\.pdf/);
});

test("high-priority email is clearly labelled and lists mandatory sales actions", () => {
  const { values } = validateRfq(validPayload());
  const rfq = { ...values, rfqReferenceId: "SOL-RFQ-2026-000008", priority: "High", createdAt: new Date("2026-03-01T04:30:00Z") };
  const message = rfqPriorityAlertEmail({ rfq });
  assert.match(message.subject, /^HIGH-PRIORITY RFQ \(≥ 1 MW\): Acme Solar EPC Pvt Ltd — 1 MW – 5 MW \[Ref #SOL-RFQ-2026-000008\]$/);
  assert.match(message.text, /Contact customer within 2 hours/);
  assert.match(message.text, /Verify company GSTIN/);
});

test("standard internal notice is used below the 1 MW threshold", () => {
  const { values } = validateRfq({ ...validPayload(), volumeTier: "100kw-500kw" });
  const rfq = { ...values, rfqReferenceId: "SOL-RFQ-2026-000009", priority: "Normal", createdAt: new Date() };
  const message = rfqInternalNoticeEmail({ rfq });
  assert.match(message.subject, /^New RFQ: Acme Solar EPC Pvt Ltd/);
  assert.ok(!/HIGH-PRIORITY/.test(message.subject));
});

test("webhook payload is Slack-shaped and states the response SLA", () => {
  const { values } = validateRfq(validPayload());
  const payload = highPriorityWebhookPayload({ rfq: { ...values, rfqReferenceId: "SOL-RFQ-2026-000010", priority: "High" } });
  assert.match(payload.text, /HIGH-PRIORITY LEAD/);
  const section = payload.blocks.find((block) => block.type === "section");
  for (const label of ["Company", "Capacity Tier", "Contact Person", "Phone", "Technology", "Project Location", "Delivery Window", "RFQ Reference", "Response SLA"]) {
    assert.match(section.text.text, new RegExp(`\\*${label}:\\*`), label);
  }
  assert.ok(payload.blocks.some((block) => block.type === "context" && /2-hour/.test(block.elements[0].text)));
});

test("datasheet selection only returns documents matching the requested technology", () => {
  const products = [
    { name: "Solarious TOPCon", slug: "topcon", technology: "N-Type TOPCon", datasheetUrl: "https://res.cloudinary.com/x/topcon.pdf" },
    { name: "Solarious HJT", slug: "hjt", technology: "HJT", datasheetUrl: "" },
  ];
  assert.equal(datasheetForTechnology("n-type-topcon", products).product, "Solarious TOPCon");
  assert.equal(datasheetForTechnology("hjt", products), null, "no datasheet URL means no attachment");
  assert.equal(datasheetForTechnology("mono-perc", products), null);
});

// --- Export -----------------------------------------------------------------

test("CSV export neutralises formulas and quotes every cell", () => {
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell('Acme, "Solar"'), '"Acme, ""Solar"""');
  const csv = buildRfqCsv([
    {
      rfqReferenceId: "SOL-RFQ-2026-000011",
      createdAt: new Date("2026-03-01T04:30:00Z"),
      companyName: "=cmd",
      fullName: "Anita",
      workEmail: "anita@acmesolar.in",
      phone: "+919876543210",
      projectType: "ci-rooftop",
      volumeTier: "500kw-1mw",
      moduleTechnology: "hjt",
      dispatchTimeline: "immediate",
      targetLocation: { city: "Nashik", state: "Maharashtra", country: "India" },
      priority: "Medium",
      status: "new",
    },
  ]);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^"RFQ Reference","Submitted \(IST\)","Company"/);
  assert.match(lines[1], /"'=cmd"/);
  assert.match(lines[1], /"Nashik, Maharashtra, India"/);
});
