// Pure RFQ (Request for Quotation) domain logic.
// No database, network or framework access: everything here is deterministic and
// unit-tested so that reference generation, priority classification and input
// validation cannot silently drift.

export const RFQ_STATUSES = Object.freeze([
  { id: "new", label: "New" },
  { id: "under_review", label: "Under Review" },
  { id: "contacted", label: "Contacted" },
  { id: "quotation_in_progress", label: "Quotation in Progress" },
  { id: "quotation_sent", label: "Quotation Sent" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "closed", label: "Closed" },
]);
export const RFQ_STATUS_IDS = Object.freeze(RFQ_STATUSES.map((status) => status.id));

export const PROJECT_TYPES = Object.freeze([
  { id: "ci-rooftop", label: "C&I Rooftop" },
  { id: "ground-mount-open-access", label: "Ground-Mount / Open Access" },
  { id: "utility-tender", label: "Utility / SECI / DISCOM Tender" },
  { id: "oem-channel", label: "OEM / Channel Distribution" },
]);

export const MODULE_TECHNOLOGIES = Object.freeze([
  { id: "n-type-topcon", label: "N-Type TOPCon", keywords: ["topcon"] },
  { id: "hjt", label: "HJT Heterojunction", keywords: ["hjt", "heterojunction"] },
  { id: "bifacial-dual-glass", label: "Bifacial Dual-Glass", keywords: ["bifacial"] },
  { id: "mono-perc", label: "Mono PERC Standard", keywords: ["perc"] },
]);

export const DISPATCH_TIMELINES = Object.freeze([
  { id: "immediate", label: "Immediate (<30 Days)" },
  { id: "60-90-days", label: "60–90 Days (Q1/Q2)" },
  { id: "planned-future", label: "Planned Future Cycle" },
  { id: "tender-contingent", label: "Contingent on Tender Award" },
]);

// minKw is inclusive, maxKw is exclusive. Priority follows the procurement rule
// supplied with the specification: 1 MW and above is always high priority.
export const VOLUME_TIERS = Object.freeze([
  { id: "under-100kw", label: "Below 100 kW", minKw: 0, maxKw: 100, priority: "Normal" },
  { id: "100kw-500kw", label: "100 kW – 500 kW", minKw: 100, maxKw: 500, priority: "Normal" },
  { id: "500kw-1mw", label: "500 kW – 1 MW", minKw: 500, maxKw: 1000, priority: "Medium" },
  { id: "1mw-5mw", label: "1 MW – 5 MW", minKw: 1000, maxKw: 5000, priority: "High" },
  { id: "5mw-25mw", label: "5 MW – 25 MW", minKw: 5000, maxKw: 25000, priority: "High" },
  { id: "25mw-plus", label: "25 MW+ Bulk Procurement", minKw: 25000, maxKw: Infinity, priority: "High" },
]);

const findById = (list, id) => list.find((item) => item.id === id) || null;
export const volumeTier = (id) => findById(VOLUME_TIERS, String(id || ""));
export const projectType = (id) => findById(PROJECT_TYPES, String(id || ""));
export const moduleTechnology = (id) => findById(MODULE_TECHNOLOGIES, String(id || ""));
export const dispatchTimeline = (id) => findById(DISPATCH_TIMELINES, String(id || ""));

export const tierLabel = (id) => volumeTier(id)?.label || "";
export const projectTypeLabel = (id) => projectType(id)?.label || "";
export const moduleTechnologyLabel = (id) => moduleTechnology(id)?.label || "";
export const dispatchTimelineLabel = (id) => dispatchTimeline(id)?.label || "";

/** Priority classification derived only from the capacity tier. */
export function classifyPriority(tierId) {
  return volumeTier(tierId)?.priority || "Normal";
}

/**
 * True for every tier whose lower bound reaches 1 MW. Used to decide whether
 * the internal high-priority alert path (email + webhook) must run.
 */
export function isHighPriority(tierId) {
  const tier = volumeTier(tierId);
  return Boolean(tier && tier.minKw >= 1000);
}

/** Lower bound of the tier in kW, used for reporting and sorting. */
export const tierMinKw = (tierId) => volumeTier(tierId)?.minKw ?? 0;

/** `SOL-RFQ-2026-000001` — sequence is zero-padded to six digits. */
export function formatReference(year, sequence) {
  const safeYear = Number.parseInt(year, 10);
  const safeSequence = Number.parseInt(sequence, 10);
  if (!Number.isInteger(safeYear) || safeYear < 2000 || safeYear > 2999)
    throw new Error("Reference year is invalid.");
  if (!Number.isInteger(safeSequence) || safeSequence < 1)
    throw new Error("Reference sequence must be a positive integer.");
  return `SOL-RFQ-${safeYear}-${String(safeSequence).padStart(6, "0")}`;
}

const REFERENCE_PATTERN = /^SOL-RFQ-(\d{4})-(\d{6,})$/;

/** Parse a reference back into its year and sequence, or null when invalid. */
export function parseReference(value) {
  const match = REFERENCE_PATTERN.exec(String(value || "").trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

export const isReference = (value) => REFERENCE_PATTERN.test(String(value || "").trim().toUpperCase());

// --- Validation -------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "hotmail.com",
  "outlook.com", "live.com", "rediffmail.com", "icloud.com", "aol.com",
]);

export const normaliseEmail = (value) => String(value || "").trim().toLowerCase();

export function isConsumerEmail(value) {
  const domain = normaliseEmail(value).split("@")[1] || "";
  return CONSUMER_DOMAINS.has(domain);
}

export const cleanText = (value, max = 200) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export const cleanMultiline = (value, max = 2000) =>
  String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

export const normalisePhone = (value) =>
  String(value || "").replace(/[\s()\-.]/g, "").replace(/^00/, "+").slice(0, 20);

/**
 * Validate and normalise an RFQ submission.
 * Returns `{ values, errors }`; `values` is always safe to persist or echo back
 * and never contains the raw request body.
 */
export function validateRfq(body = {}) {
  const errors = {};
  const source = body && typeof body === "object" ? body : {};

  const values = {
    fullName: cleanText(source.fullName, 120),
    workEmail: normaliseEmail(cleanText(source.workEmail, 160)),
    phone: normalisePhone(source.phone),
    companyName: cleanText(source.companyName, 160),
    gstin: cleanText(source.gstin, 15).toUpperCase(),
    designation: cleanText(source.designation, 80),
    projectType: cleanText(source.projectType, 40),
    volumeTier: cleanText(source.volumeTier, 40),
    moduleTechnology: cleanText(source.moduleTechnology, 40),
    dispatchTimeline: cleanText(source.dispatchTimeline, 40),
    targetLocation: {
      country: cleanText(source.targetLocation?.country ?? source.country, 80),
      state: cleanText(source.targetLocation?.state ?? source.state, 80),
      city: cleanText(source.targetLocation?.city ?? source.city, 80),
      site: cleanText(source.targetLocation?.site ?? source.site, 160),
    },
    specificationRequirements: cleanMultiline(source.specificationRequirements, 2000),
    projectNotes: cleanMultiline(source.projectNotes, 1000),
    privacyConsent: source.privacyConsent === true || source.privacyConsent === "true",
  };

  if (values.fullName.length < 2) errors.fullName = "Enter the contact's full name.";

  if (!values.workEmail) errors.workEmail = "Enter a corporate work email address.";
  else if (values.workEmail.length > 160 || !EMAIL_PATTERN.test(values.workEmail))
    errors.workEmail = "Enter a valid corporate work email address.";

  if (!values.phone) errors.phone = "Enter a direct phone or WhatsApp number.";
  else if (!PHONE_PATTERN.test(values.phone)) errors.phone = "Enter a valid phone number with 7 to 15 digits.";

  if (values.companyName.length < 2) errors.companyName = "Enter the registered company name.";

  if (values.gstin && !GSTIN_PATTERN.test(values.gstin))
    errors.gstin = "Enter a valid 15-character GSTIN or leave it blank.";

  if (!projectType(values.projectType)) errors.projectType = "Select an application category.";
  if (!volumeTier(values.volumeTier)) errors.volumeTier = "Select a project capacity tier.";
  if (!moduleTechnology(values.moduleTechnology)) errors.moduleTechnology = "Select a module technology.";
  if (!dispatchTimeline(values.dispatchTimeline)) errors.dispatchTimeline = "Select a deployment timeline.";

  if (values.targetLocation.country.length < 2) errors.country = "Enter the project country.";
  if (values.targetLocation.state.length < 2) errors.state = "Enter the project state or region.";
  if (values.targetLocation.city.length < 2) errors.city = "Enter the project city.";

  if (!values.privacyConsent) errors.privacyConsent = "Confirm the privacy consent to submit an RFQ.";

  const priority = volumeTier(values.volumeTier) ? classifyPriority(values.volumeTier) : "Normal";

  return { values, errors, priority, highPriority: isHighPriority(values.volumeTier) };
}

export const locationLabel = (location = {}) =>
  [location.city, location.state, location.country].map((part) => String(part || "").trim()).filter(Boolean).join(", ");

/** Safe payload for the public submitter — never internal notes or assignment. */
export function publicRfqSummary(rfq = {}) {
  return {
    rfqReferenceId: rfq.rfqReferenceId,
    companyName: rfq.companyName,
    fullName: rfq.fullName,
    workEmail: rfq.workEmail,
    volumeTier: rfq.volumeTier,
    volumeTierLabel: tierLabel(rfq.volumeTier),
    moduleTechnology: rfq.moduleTechnology,
    moduleTechnologyLabel: moduleTechnologyLabel(rfq.moduleTechnology),
    projectType: rfq.projectType,
    projectTypeLabel: projectTypeLabel(rfq.projectType),
    dispatchTimeline: rfq.dispatchTimeline,
    dispatchTimelineLabel: dispatchTimelineLabel(rfq.dispatchTimeline),
    priority: rfq.priority,
    status: rfq.status,
    createdAt: rfq.createdAt,
  };
}

// --- IST formatting ---------------------------------------------------------

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function formatIst(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${IST_FORMATTER.format(date)} IST`;
}

// --- CSV export -------------------------------------------------------------

// Prefix anything a spreadsheet would treat as a formula, then quote-escape.
export const spreadsheetSafe = (value) => {
  const text = String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
};
export const csvCell = (value) => `"${spreadsheetSafe(value)}"`;

export const RFQ_EXPORT_COLUMNS = Object.freeze([
  ["rfqReferenceId", "RFQ Reference"],
  ["createdAt", "Submitted (IST)"],
  ["companyName", "Company"],
  ["fullName", "Contact"],
  ["workEmail", "Work Email"],
  ["phone", "Phone"],
  ["gstin", "GSTIN"],
  ["designation", "Designation"],
  ["projectType", "Application"],
  ["volumeTier", "Capacity Tier"],
  ["moduleTechnology", "Module Technology"],
  ["dispatchTimeline", "Timeline"],
  ["targetLocation", "Project Location"],
  ["specificationRequirements", "Technical Requirements"],
  ["projectNotes", "Project Notes"],
  ["priority", "Priority"],
  ["status", "Status"],
  ["assignedTo", "Assigned To"],
  ["followUpDate", "Follow-up"],
  ["internalRemarks", "Internal Remarks"],
]);

const exportValue = (rfq, key) => {
  if (key === "createdAt") return formatIst(rfq.createdAt);
  if (key === "targetLocation") return locationLabel(rfq.targetLocation);
  if (key === "followUpDate") return rfq.followUpDate ? formatIst(rfq.followUpDate) : "";
  return rfq[key] ?? "";
};

/** CSV for the admin export endpoint, including a header row. */
export function buildRfqCsv(rfqs = []) {
  const header = RFQ_EXPORT_COLUMNS.map(([, label]) => csvCell(label)).join(",");
  const rows = rfqs.map((rfq) =>
    RFQ_EXPORT_COLUMNS.map(([key]) => csvCell(exportValue(rfq, key))).join(","),
  );
  return [header, ...rows].join("\r\n");
}

// --- Email templates --------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Pick a real datasheet for the requested technology, or null. */
export function datasheetForTechnology(technologyId, products = []) {
  const technology = moduleTechnology(technologyId);
  if (!technology) return null;
  const match = products.find((product) => {
    const haystack = `${product?.technology || ""} ${product?.name || ""} ${product?.slug || ""}`.toLowerCase();
    return technology.keywords.some((keyword) => haystack.includes(keyword)) && Boolean(product?.datasheetUrl);
  });
  if (!match) return null;
  const url = String(match.datasheetUrl);
  if (!/^https?:\/\/|^\//.test(url)) return null;
  return { title: `${match.name} technical datasheet`, url, product: match.name };
}

export function rfqConfirmationEmail({ rfq, senderName = "Solarious Energy Procurement Desk", datasheet = null }) {
  const reference = rfq.rfqReferenceId;
  const subject = `[Solarious Energy] RFQ Confirmation & Technical Datasheet — Ref #${reference} (${rfq.companyName})`;
  const rows = [
    ["Organization", rfq.companyName],
    ["Contact Phone", rfq.phone],
    ["Module Architecture", moduleTechnologyLabel(rfq.moduleTechnology)],
    ["Capacity Tier", tierLabel(rfq.volumeTier)],
    ["Application Type", projectTypeLabel(rfq.projectType)],
    ["Target Location", locationLabel(rfq.targetLocation)],
    ["Timeline", dispatchTimelineLabel(rfq.dispatchTimeline)],
  ];
  const datasheetLine = datasheet
    ? `<p>Technical datasheet: <a href="${escapeHtml(datasheet.url)}">${escapeHtml(datasheet.title)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#152535">
<div style="max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#0f2b46;color:#fff;padding:24px">
    <strong style="font-size:20px;letter-spacing:.04em">SOLARIOUS ENERGY</strong>
    <p style="margin:8px 0 0;color:#c9d8e6">Commercial &amp; Technical Sales Desk</p>
  </div>
  <div style="background:#fff;padding:26px;border:1px solid #e2e8f0;border-top:0">
    <p>Dear ${escapeHtml(rfq.fullName)},</p>
    <p>Thank you for your commercial procurement inquiry regarding Solarious Energy photovoltaic modules.</p>
    <p>We have logged your Request for Quotation under Reference <strong>#${escapeHtml(reference)}</strong>.</p>
    <p>Our engineering and sales estimation desk is reviewing your project capacity parameters to prepare a formal commercial offer, dispatch schedule and tier-appropriate volume pricing.</p>
    <h3 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a5a1e;margin:24px 0 8px">Project parameters</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:7px 0;color:#5b6b7b;width:42%">${escapeHtml(label)}</td><td style="padding:7px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
      )
      .join("")}</table>
    <h3 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a5a1e;margin:24px 0 8px">Next steps</h3>
    <p>A dedicated Key Account Manager will contact you within 24 business hours with:</p>
    <ol style="padding-left:20px;line-height:1.7"><li>Formal commercial quotation.</li><li>Production slot availability and dispatch lead times.</li><li>Factory inspection and compliance documentation packages.</li></ol>
    ${datasheetLine}
    <p style="margin-top:26px">Best regards,<br><strong>Commercial &amp; Technical Sales Desk</strong><br>Solarious Energy</p>
    <p style="color:#7a8896;font-size:12px;border-top:1px solid #eef2f6;padding-top:14px">Reference #${escapeHtml(reference)}. Estimates and lead times are indicative until confirmed in a formal quotation. This message was sent by ${escapeHtml(senderName)}.</p>
  </div>
</div></body></html>`;
  const text = [
    `Dear ${rfq.fullName},`,
    "",
    "Thank you for your commercial procurement inquiry regarding Solarious Energy photovoltaic modules.",
    `We have logged your Request for Quotation under Reference #${reference}.`,
    "",
    "PROJECT PARAMETERS:",
    ...rows.map(([label, value]) => `- ${label}: ${value}`),
    "",
    "NEXT STEPS:",
    "A dedicated Key Account Manager will contact you within 24 business hours with:",
    "1. Formal commercial quotation.",
    "2. Production slot availability and dispatch lead times.",
    "3. Factory inspection and compliance documentation packages.",
    ...(datasheet ? ["", `Technical datasheet: ${datasheet.url}`] : []),
    "",
    "Best regards,",
    "Commercial & Technical Sales Desk",
    "Solarious Energy",
  ].join("\n");
  return { subject, html, text };
}

/** Standard internal notice for RFQs below the 1 MW high-priority threshold. */
export function rfqInternalNoticeEmail({ rfq }) {
  const reference = rfq.rfqReferenceId;
  const subject = `New RFQ: ${rfq.companyName} — ${tierLabel(rfq.volumeTier)} [Ref #${reference}]`;
  const rows = [
    ["RFQ Reference", reference],
    ["Submitted (IST)", formatIst(rfq.createdAt)],
    ["Company", rfq.companyName],
    ["Contact Person", rfq.fullName],
    ["Corporate Email", rfq.workEmail],
    ["Phone / WhatsApp", rfq.phone],
    ["Project Location", locationLabel(rfq.targetLocation)],
    ["Capacity Tier", tierLabel(rfq.volumeTier)],
    ["Module Technology", moduleTechnologyLabel(rfq.moduleTechnology)],
    ["Application Type", projectTypeLabel(rfq.projectType)],
    ["Delivery Timeline", dispatchTimelineLabel(rfq.dispatchTimeline)],
    ["Priority", rfq.priority],
    ["Technical Requirements", rfq.specificationRequirements || "Not provided"],
    ...(rfq.projectNotes ? [["Project Notes", rfq.projectNotes]] : []),
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#152535">
<div style="max-width:660px;margin:0 auto;padding:24px">
  <div style="background:#0f2b46;color:#fff;padding:20px 24px"><strong style="font-size:18px">New procurement RFQ</strong><p style="margin:6px 0 0;color:#c9d8e6">${escapeHtml(tierLabel(rfq.volumeTier))} · ${escapeHtml(rfq.priority)} priority</p></div>
  <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0">
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:7px 0;color:#5b6b7b;width:40%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0"><strong>${escapeHtml(value).replace(/\n/g, "<br>")}</strong></td></tr>`,
      )
      .join("")}</table>
  </div>
</div></body></html>`;
  const text = [subject, "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n");
  return { subject, html, text };
}

export function rfqPriorityAlertEmail({ rfq, salesActions = [] }) {
  const reference = rfq.rfqReferenceId;
  const subject = `HIGH-PRIORITY RFQ (≥ 1 MW): ${rfq.companyName} — ${tierLabel(rfq.volumeTier)} [Ref #${reference}]`;
  const rows = [
    ["RFQ Reference", reference],
    ["Submitted (IST)", formatIst(rfq.createdAt)],
    ["Company", rfq.companyName],
    ["Contact Person", rfq.fullName],
    ["Corporate Email", rfq.workEmail],
    ["Phone / WhatsApp", rfq.phone],
    ["GSTIN", rfq.gstin || "Not provided"],
    ["Project Location", locationLabel(rfq.targetLocation)],
    ["Capacity Tier", tierLabel(rfq.volumeTier)],
    ["Module Technology", moduleTechnologyLabel(rfq.moduleTechnology)],
    ["Application Type", projectTypeLabel(rfq.projectType)],
    ["Delivery Timeline", dispatchTimelineLabel(rfq.dispatchTimeline)],
    ["Technical Requirements", rfq.specificationRequirements || "Not provided"],
    ...(rfq.projectNotes ? [["Project Notes", rfq.projectNotes]] : []),
  ];
  const actions = salesActions.length
    ? salesActions
    : [
        "Verify company GSTIN and credit/tender profile.",
        "Check warehouse inventory or production pipeline.",
        "Contact customer within 2 hours.",
        "Update the CRM deal record.",
      ];
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#152535">
<div style="max-width:680px;margin:0 auto;padding:24px">
  <div style="background:#8c1d18;color:#fff;padding:20px 24px"><strong style="font-size:18px">HIGH-PRIORITY RFQ (≥ 1 MW)</strong><p style="margin:6px 0 0;color:#ffd9d4">Two-hour first-response SLA</p></div>
  <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0">
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:7px 0;color:#5b6b7b;width:40%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0"><strong>${escapeHtml(value).replace(/\n/g, "<br>")}</strong></td></tr>`,
      )
      .join("")}</table>
    <h3 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8c1d18;margin:24px 0 8px">Mandatory sales actions</h3>
    <ol style="padding-left:20px;line-height:1.7">${actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol>
  </div>
</div></body></html>`;
  const text = [
    `HIGH-PRIORITY RFQ (>= 1 MW): ${rfq.companyName} - ${tierLabel(rfq.volumeTier)} [Ref #${reference}]`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "MANDATORY SALES ACTIONS:",
    ...actions.map((action, index) => `${index + 1}. ${action}`),
  ].join("\n");
  return { subject, html, text };
}

/** Slack-compatible (also accepted by Teams incoming webhooks) JSON payload. */
export function highPriorityWebhookPayload({ rfq, slaHours = 2 }) {
  const reference = rfq.rfqReferenceId;
  const fields = [
    ["Company", rfq.companyName],
    ["Capacity Tier", tierLabel(rfq.volumeTier)],
    ["Contact Person", rfq.fullName],
    ["Phone", rfq.phone],
    ["Technology", moduleTechnologyLabel(rfq.moduleTechnology)],
    ["Project Location", locationLabel(rfq.targetLocation)],
    ["Delivery Window", dispatchTimelineLabel(rfq.dispatchTimeline)],
    ["RFQ Reference", reference],
    ["Response SLA", `${slaHours} hours`],
  ];
  return {
    text: `HIGH-PRIORITY LEAD: ${rfq.companyName} — ${tierLabel(rfq.volumeTier)} [${reference}]`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "HIGH-PRIORITY LEAD (≥ 1 MW)", emoji: false } },
      { type: "section", text: { type: "mrkdwn", text: fields.map(([label, value]) => `*${label}:* ${value || "—"}`).join("\n") } },
      { type: "context", elements: [{ type: "mrkdwn", text: `Submitted ${formatIst(rfq.createdAt)} · ${slaHours}-hour first-response SLA` }] },
    ],
  };
}
