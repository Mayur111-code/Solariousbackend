/**
 * Weekly business activity report.
 *
 * Builds a self-contained HTML email from real database records: enquiries,
 * RFQ-style quote requests, AI creative activity, document uploads and admin
 * actions. Everything is escaped, no credentials or internal configuration is
 * ever rendered, and the markup is table-based with inline styles so Gmail,
 * Outlook and mobile clients all render it consistently.
 */

const escapeHtml = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const spreadsheetSafe = value => {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
};

export const csvCell = value => `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;

const NAVY = "#061B36";
const NAVY_SOFT = "#0B2C52";
const GOLD = "#F5B52E";
const SKY = "#F4F8FC";
const INK = "#102A4C";
const MUTED = "#5B7188";
const LINE = "#DCE6F2";

const validDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const istDate = value => {
  const date = validDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const istDateTime = value => {
  const date = validDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const sourceOf = item => {
  if (item.kind === "quote") return "Quote request";
  if (item.kind === "ai_assistant") return "AI assistant";
  if (item.kind === "solar_recommendation") return "Solar recommendation";
  return "Contact form";
};

const requirementOf = item =>
  item.product || item.capacity || item.message || "General enquiry";

/**
 * @returns {{subject:string, html:string, csv:string, counts:object, periodLabel:string}}
 */
export function buildActivityReport({
  enquiries = [],
  creatives = [],
  resources = [],
  adminActivity = [],
  start,
  end,
  company = {},
} = {}) {
  const safe = Array.isArray;
  const enquiryRows = safe(enquiries) ? enquiries : [];
  const creativeRows = safe(creatives) ? creatives : [];
  const resourceRows = safe(resources) ? resources : [];
  const activityRows = safe(adminActivity) ? adminActivity : [];

  const byStatus = status => enquiryRows.filter(item => item.status === status).length;
  const counts = {
    totalEnquiries: enquiryRows.length,
    contact: enquiryRows.filter(item => !["quote", "ai_assistant"].includes(item.kind)).length,
    quote: enquiryRows.filter(item => item.kind === "quote").length,
    product: enquiryRows.filter(item => String(item.product || "").trim()).length,
    project: enquiryRows.filter(
      item =>
        item.kind === "quote" ||
        Boolean(item.capacity) ||
        Boolean(item.details?.projectType),
    ).length,
    newLeads: byStatus("new"),
    pending: enquiryRows.filter(item => ["new", "qualified"].includes(item.status)).length,
    resolved: byStatus("closed"),
    inProgress: byStatus("contacted"),
    creativesGenerated: creativeRows.filter(item => item.status === "completed").length,
    creativeFailures: creativeRows.filter(item => item.status === "failed").length,
    creativesAwaitingReview: creativeRows.filter(
      item => item.status === "completed" && (item.reviewStatus || "pending") === "pending",
    ).length,
    documentsUploaded: resourceRows.length,
    adminActions: activityRows.length,
  };
  counts.totalActivity =
    counts.totalEnquiries +
    counts.creativesGenerated +
    counts.documentsUploaded +
    counts.adminActions;

  const brand = company.brand || company.legalName || "Solarious Energy";
  const periodLabel = `${istDate(start)} – ${istDate(end)}`;
  const subject = `${brand} – Weekly Business Activity Report | ${istDate(start)} – ${istDate(end)}`;

  const logoUrl = String(company.logoUrl || "").startsWith("http")
    ? company.logoUrl
    : "";

  const card = (label, value, hint = "") => `
    <td width="33.33%" valign="top" style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SKY};border:1px solid ${LINE};border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font:700 11px/1.3 Arial,Helvetica,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};">${escapeHtml(label)}</div>
            <div style="font:700 26px/1.2 Arial,Helvetica,sans-serif;color:${NAVY};padding-top:4px;">${escapeHtml(value)}</div>
            ${hint ? `<div style="font:400 11px/1.4 Arial,Helvetica,sans-serif;color:${MUTED};padding-top:2px;">${escapeHtml(hint)}</div>` : ""}
          </td>
        </tr>
      </table>
    </td>`;

  const cardRow = cells => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join("")}</tr></table>`;

  const sectionTitle = (title, note = "") => `
    <tr>
      <td style="padding:26px 0 10px;">
        <div style="font:700 15px/1.3 Arial,Helvetica,sans-serif;color:${NAVY};">${escapeHtml(title)}</div>
        ${note ? `<div style="font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};padding-top:2px;">${escapeHtml(note)}</div>` : ""}
        <div style="height:2px;background:${GOLD};width:38px;margin-top:8px;"></div>
      </td>
    </tr>`;

  const statusPill = status => {
    const tone =
      status === "closed"
        ? { background: "#E7F6EC", color: "#14663A" }
        : status === "contacted"
          ? { background: "#E9F1F9", color: "#0B2C52" }
          : status === "qualified"
            ? { background: "#FEF6E6", color: "#7A5306" }
            : { background: "#FDECEA", color: "#9E2923" };
    return `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font:700 10px/1.6 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.6px;background:${tone.background};color:${tone.color};">${escapeHtml(status || "new")}</span>`;
  };

  const tableStyle = `width:100%;border-collapse:collapse;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${INK};`;
  const th = `padding:9px 10px;text-align:left;background:${SKY};border-bottom:1px solid ${LINE};font:700 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:${MUTED};`;
  const td = `padding:9px 10px;border-bottom:1px solid ${LINE};vertical-align:top;`;

  const enquiryTable = rows => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="${tableStyle}">
      <thead>
        <tr>
          <th style="${th}">Customer</th>
          <th style="${th}">Contact</th>
          <th style="${th}">Source</th>
          <th style="${th}">Requirement</th>
          <th style="${th}">Received</th>
          <th style="${th}">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            item => `<tr>
              <td style="${td}"><strong style="color:${NAVY};">${escapeHtml(item.name || "—")}</strong>${item.company ? `<div style="color:${MUTED};">${escapeHtml(item.company)}</div>` : ""}</td>
              <td style="${td}">${escapeHtml(item.phone || "—")}<div style="color:${MUTED};">${escapeHtml(item.email || "")}</div></td>
              <td style="${td}">${escapeHtml(sourceOf(item))}</td>
              <td style="${td}">${escapeHtml(requirementOf(item))}</td>
              <td style="${td}">${escapeHtml(istDate(item.createdAt))}</td>
              <td style="${td}">${statusPill(item.status)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  const pendingRows = enquiryRows
    .filter(item => ["new", "qualified"].includes(item.status))
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .slice(0, 20);

  const creativeRowsForEmail = creativeRows
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 10);

  const activityList = activityRows
    .slice(0, 12)
    .map(
      item =>
        `<li style="margin:0 0 6px;"><strong style="color:${NAVY};">${escapeHtml(String(item.action || "activity").replace(/[._]/g, " "))}</strong> <span style="color:${MUTED};">· ${escapeHtml(item.actor || "admin")} · ${escapeHtml(istDateTime(item.createdAt))}</span></li>`,
    )
    .join("");

  const emptyState = `
    <tr>
      <td style="padding:8px 0 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SKY};border:1px dashed #C6D6E6;border-radius:12px;">
          <tr>
            <td style="padding:22px;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${INK};">
              <strong style="color:${NAVY};">No new activity was recorded during this reporting period.</strong><br>
              The automation ran normally — there were simply no enquiries, creatives or document uploads in this window.
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${SKY};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Weekly business activity for ${escapeHtml(periodLabel)} — ${counts.totalEnquiries} enquir${counts.totalEnquiries === 1 ? "y" : "ies"}, ${counts.creativesGenerated} creative${counts.creativesGenerated === 1 ? "" : "s"}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SKY};padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINE};">
        <tr>
          <td style="background:${NAVY};padding:26px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand)}" height="42" style="display:block;height:42px;width:auto;background:#ffffff;padding:5px 9px;border-radius:8px;">` : `<div style="font:700 20px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:.5px;">${escapeHtml(brand)}</div>`}
                </td>
                <td align="right" valign="middle">
                  <div style="font:700 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:${GOLD};">Weekly report</div>
                </td>
              </tr>
            </table>
            <div style="font:700 23px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;padding-top:18px;">Business Activity Report</div>
            <div style="font:400 13px/1.6 Arial,Helvetica,sans-serif;color:rgba(255,255,255,.72);padding-top:6px;">Reporting period: ${escapeHtml(periodLabel)} <span style="color:rgba(255,255,255,.4);">·</span> Asia/Kolkata</div>
          </td>
        </tr>
        <tr><td style="height:4px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:22px 22px 8px;">
            ${cardRow([
              card("New enquiries", counts.totalEnquiries, `${counts.newLeads} awaiting first contact`),
              card("Quote requests", counts.quote, `${counts.product} product-specific`),
              card("Pending", counts.pending, `${counts.resolved} closed`),
            ])}
            <div style="height:6px;"></div>
            ${cardRow([
              card("Creatives generated", counts.creativesGenerated, `${counts.creativeFailures} failed`),
              card("Awaiting review", counts.creativesAwaitingReview, "Admin approval required"),
              card("Documents", counts.documentsUploaded, `${counts.adminActions} admin actions`),
            ])}
          </td>
        </tr>
        ${
          counts.totalActivity === 0
            ? emptyState
            : `
        <tr>
          <td style="padding:0 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${sectionTitle("Enquiry breakdown", "Every enquiry recorded in this window, including AI assistant leads.")}
              <tr><td>${enquiryTable(enquiryRows.slice(0, 25))}</td></tr>
              ${enquiryRows.length > 25 ? `<tr><td style="padding:8px 0;font:400 11px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">Showing the first 25 of ${enquiryRows.length} enquiries. The attached CSV contains the full period.</td></tr>` : ""}
              <tr>
                <td style="padding:14px 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${INK};">
                    <tr>
                      <td style="padding-right:16px;">Contact form <strong>${counts.contact}</strong></td>
                      <td style="padding-right:16px;">Quote requests <strong>${counts.quote}</strong></td>
                      <td style="padding-right:16px;">Project enquiries <strong>${counts.project}</strong></td>
                      <td>In progress <strong>${counts.inProgress}</strong></td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${sectionTitle("Pending enquiries", "Oldest first — these still need a response from the sales desk.")}
              <tr><td>${pendingRows.length ? enquiryTable(pendingRows) : `<div style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">No pending enquiries. Every recorded enquiry has been actioned.</div>`}</td></tr>
              ${sectionTitle("AI creative activity", "Generated marketing creatives are drafts until an admin approves them.")}
              <tr><td>${
                creativeRowsForEmail.length
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="${tableStyle}"><thead><tr><th style="${th}">Headline</th><th style="${th}">Category</th><th style="${th}">Generation</th><th style="${th}">Review</th><th style="${th}">Created</th></tr></thead><tbody>${creativeRowsForEmail
                      .map(
                        item => `<tr><td style="${td}">${escapeHtml(item.headline || "—")}</td><td style="${td}">${escapeHtml(item.campaignType || "—")}</td><td style="${td}">${escapeHtml(item.status || "—")}${item.failureCode ? `<div style="color:#9E2923;">${escapeHtml(item.failureCode)}</div>` : ""}</td><td style="${td}">${escapeHtml(item.reviewStatus || "pending")}</td><td style="${td}">${escapeHtml(istDate(item.createdAt))}</td></tr>`,
                      )
                      .join("")}</tbody></table>`
                  : `<div style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">No AI creatives were generated during this period.</div>`
              }</td></tr>
              ${sectionTitle("Documents and admin activity")}
              <tr><td>
                <div style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${INK};">
                  ${resourceRows.length ? `<strong style="color:${NAVY};">${counts.documentsUploaded}</strong> document${counts.documentsUploaded === 1 ? "" : "s"} uploaded: ${escapeHtml(resourceRows.slice(0, 6).map(item => item.title).filter(Boolean).join(", "))}${resourceRows.length > 6 ? " and others" : ""}.` : "No documents were uploaded during this period."}
                </div>
                ${activityList ? `<ul style="margin:12px 0 0;padding-left:18px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${INK};">${activityList}</ul>` : ""}
              </td></tr>
            </table>
          </td>
        </tr>`
        }
        <tr>
          <td style="padding:26px 22px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY_SOFT};border-radius:12px;">
              <tr>
                <td style="padding:16px 18px;font:400 12px/1.7 Arial,Helvetica,sans-serif;color:rgba(255,255,255,.78);">
                  <strong style="color:#ffffff;">Automated report.</strong> Generated from live Solarious Energy records — no credentials, API keys or internal configuration are included.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${NAVY};padding:22px 22px;font:400 11px/1.7 Arial,Helvetica,sans-serif;color:rgba(255,255,255,.7);">
            <strong style="display:block;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:#ffffff;">${escapeHtml(company.legalName || brand)}</strong>
            ${company.address ? `${escapeHtml(company.address)}<br>` : ""}
            ${company.email ? `<a href="mailto:${escapeHtml(company.email)}" style="color:${GOLD};text-decoration:none;">${escapeHtml(company.email)}</a>` : ""}
            ${company.phone ? ` &nbsp;·&nbsp; ${escapeHtml(company.phone)}` : ""}
            ${company.website ? `<br><a href="${escapeHtml(company.website)}" style="color:${GOLD};text-decoration:none;">${escapeHtml(company.website)}</a>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const headings = [
    "Sr. No.",
    "Customer Name",
    "Company",
    "Mobile",
    "Email",
    "Enquiry Source",
    "Requirement",
    "Received Date",
    "Status",
  ];
  const csv = [
    headings.map(csvCell).join(","),
    ...enquiryRows.map((item, index) =>
      [
        index + 1,
        item.name,
        item.company,
        item.phone,
        item.email,
        sourceOf(item),
        requirementOf(item),
        validDate(item.createdAt)?.toISOString() || "",
        item.status,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");

  return { subject, html, csv, counts, periodLabel };
}
