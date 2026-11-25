/**
 * Product quote enquiry notifications.
 *
 * Every `kind: "quote"` enquiry is persisted first by `/api/inquiries` and then
 * handed to this module. Delivery never throws into the request path: a quote
 * must still succeed when SMTP is down. Notification state is stored on the
 * enquiry so the background sweep can retry without sending the same email
 * twice.
 *
 * The module is dependency-injected (`Inquiry`, `Product`, `sendEmail`) so the
 * delivery state machine and responsive template are testable without MongoDB
 * or a live SMTP account.
 */

import { randomUUID } from "node:crypto";

const SALES_EMAIL_FALLBACK = "sales@solariousenergy.com";
const SITE_URL_FALLBACK = "https://solariousenergy.com";
const DEFAULT_MAX_ATTEMPTS = 12;
const DEFAULT_CLAIM_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;

const CATEGORY_LABELS = {
  "mono-perc": "Mono PERC",
  hjt: "HJT",
  bifacial: "Bifacial",
  topcon: "TOPCon",
};

const clean = (value) => String(value ?? "").trim();

const asPlain = (value) => {
  if (!value) return value;
  return typeof value.toObject === "function" ? value.toObject() : value;
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

const escapeNewlines = (value) =>
  escapeHtml(value).replace(/\r?\n/g, "<br />");

/**
 * Keep only fields the frontend can legitimately send. Nested objects,
 * functions and oversized values are dropped, and HTML tags are stripped
 * before the value is stored or rendered in the email.
 */
export function sanitizeInquiryDetails(value) {
  const source = asPlain(value);
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  const details = {};
  for (const [key, raw] of Object.entries(source).slice(0, 40)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) continue;
    if (typeof raw === "string") {
      details[key] = raw.replace(/<[^>]*>/g, "").trim().slice(0, 500);
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      details[key] = raw;
    } else if (typeof raw === "boolean") {
      details[key] = raw;
    } else if (Array.isArray(raw)) {
      const list = raw
        .filter((entry) => typeof entry === "string" || typeof entry === "number")
        .slice(0, 10)
        .map((entry) => clean(entry).slice(0, 200))
        .filter(Boolean);
      if (list.length) details[key] = list;
    }
  }
  return details;
}

export function quoteRecipients(env = process.env) {
  const configured = clean(env.SALES_EMAIL)
    .split(/[,;]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => EMAIL_PATTERN.test(entry));
  return configured.length ? configured : [SALES_EMAIL_FALLBACK];
}

export function quoteSiteUrl(env = process.env) {
  const raw =
    clean(env.PUBLIC_SITE_URL) ||
    clean(env.SITE_URL) ||
    clean(env.NEXT_PUBLIC_SITE_URL) ||
    SITE_URL_FALLBACK;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return SITE_URL_FALLBACK;
    return url.toString().replace(/\/$/, "");
  } catch {
    return SITE_URL_FALLBACK;
  }
}

function maxAttempts(env) {
  const parsed = Number(env.QUOTE_EMAIL_MAX_ATTEMPTS);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 50)
    : DEFAULT_MAX_ATTEMPTS;
}

function claimDuration(env) {
  const parsed = Number(env.QUOTE_EMAIL_CLAIM_MS);
  return Number.isInteger(parsed) && parsed >= 60_000
    ? parsed
    : DEFAULT_CLAIM_MS;
}

export function quoteNotificationConfiguration(env = process.env) {
  return {
    recipients: quoteRecipients(env),
    siteUrl: quoteSiteUrl(env),
    maxAttempts: maxAttempts(env),
    claimMs: claimDuration(env),
  };
}

const categoryLabel = (value) => {
  const key = clean(value).toLowerCase();
  if (!key) return "Not specified";
  return (
    CATEGORY_LABELS[key] ||
    key
      .replace(/[-_]+/g, " ")
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
  );
};

const sourceLabel = (value) => {
  const source = clean(value);
  if (!source) return "Website";
  return source
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
};

const detailLabel = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const detailValue = (value) => {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return clean(value) || "Not specified";
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(safe)} IST`;
};

/**
 * Find the canonical catalogue record for an enquiry. Customer-supplied names
 * are never trusted; when a slug matches, the email and stored record use the
 * database name/model/category.
 */
export async function resolveQuoteProduct(inquiry, Product) {
  if (!Product || typeof Product.findOne !== "function") return null;
  const row = asPlain(inquiry) || {};
  const details = asPlain(row.details) || {};
  const slug = clean(details.productSlug).toLowerCase();
  const name = clean(row.product);

  try {
    let product = null;
    if (slug && SLUG_PATTERN.test(slug)) {
      product = await Product.findOne({ slug }).lean();
    }
    if (!product && name && !SLUG_PATTERN.test(name)) {
      product = await Product.findOne({ name }).lean();
    }
    const plain = asPlain(product);
    if (!plain) return null;
    return {
      id: String(plain._id || plain.id || ""),
      name: clean(plain.name),
      modelNumber: clean(plain.modelNumber),
      category: clean(plain.category),
      slug: clean(plain.slug),
    };
  } catch {
    // Catalogue lookup is best-effort: an unavailable lookup must not stop a
    // legitimate quote from being stored or emailed.
    return null;
  }
}

function productPageUrl(siteUrl, product, details) {
  const base = siteUrl || SITE_URL_FALLBACK;
  if (product?.category && product?.slug) {
    return `${base}/products/${encodeURIComponent(product.category)}/${encodeURIComponent(product.slug)}`;
  }
  if (clean(details.productSlug) && SLUG_PATTERN.test(clean(details.productSlug))) {
    return `${base}/products`;
  }
  return `${base}/quote`;
}

const RESERVED_DETAILS = new Set([
  "name",
  "email",
  "phone",
  "company",
  "product",
  "capacity",
  "location",
  "message",
  "source",
  "productSlug",
  "wattage",
  "quantity",
  "productId",
  "productCategory",
  "productPageUrl",
]);

function additionalDetailRows(details) {
  return Object.entries(details)
    .filter(([key, value]) => !RESERVED_DETAILS.has(key) && value !== "" && value != null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      label: detailLabel(key),
      value: detailValue(value),
    }));
}

function detailRow({ label, value, href }) {
  const renderedValue = href
    ? `<a href="${escapeHtml(href)}" style="color:#075e54;text-decoration:none;word-break:break-word;">${escapeHtml(value)}</a>`
    : escapeHtml(value);
  return `<tr>
    <td class="detail-label" style="width:38%;padding:10px 14px;border-bottom:1px solid #e7eaf0;vertical-align:top;font-size:11px;line-height:17px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#667085;">${escapeHtml(label)}</td>
    <td class="detail-value" style="width:62%;padding:10px 14px;border-bottom:1px solid #e7eaf0;vertical-align:top;font-size:14px;line-height:21px;color:#101116;word-break:break-word;">${renderedValue}</td>
  </tr>`;
}

function detailTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #e7eaf0;border-radius:8px;overflow:hidden;">${rows
    .map(detailRow)
    .join("")}</table>`;
}

/**
 * Build the sales notification. Subject and body are deterministic so the
 * message can be inspected in tests before any SMTP transport is involved.
 */
export function quoteInquiryEmail({ inquiry, product, siteUrl, now = new Date() } = {}) {
  const row = asPlain(inquiry) || {};
  const details = sanitizeInquiryDetails(row.details);
  const productName = clean(product?.name) || clean(row.product) || "General solar enquiry";
  const subjectProduct = productName.replace(/[\r\n]+/g, " ").slice(0, 140);
  const category =
    clean(product?.category) || clean(details.productCategory)
      ? categoryLabel(clean(product?.category) || clean(details.productCategory))
      : "Not specified";
  const productId =
    clean(product?.modelNumber) ||
    clean(product?.id) ||
    clean(details.productId) ||
    "Not provided";
  const quantity =
    details.quantity !== undefined && details.quantity !== ""
      ? detailValue(details.quantity)
      : "Not specified";
  const capacity = clean(row.capacity) || clean(details.wattage) || "Not specified";
  const customerEmail = clean(row.email);
  const customerPhone = clean(row.phone);
  const source = sourceLabel(details.source);
  const pageUrl = productPageUrl(siteUrl, product, details);
  const receivedAt = formatDate(row.createdAt || now);
  const message = clean(row.message) || "No additional message provided.";
  const extras = additionalDetailRows(details);
  const emailHref = EMAIL_PATTERN.test(customerEmail)
    ? `mailto:${customerEmail}`
    : undefined;

  const rows = [
    { label: "Full name", value: clean(row.name) || "Not provided" },
    { label: "Email address", value: customerEmail || "Not provided", href: emailHref },
    { label: "Phone number", value: customerPhone || "Not provided" },
    { label: "Company", value: clean(row.company) || "Not provided" },
    { label: "Product name", value: productName },
    { label: "Product ID", value: productId },
    { label: "Product category", value: category },
    { label: "Requested quantity", value: quantity },
    { label: "Wattage / capacity", value: capacity },
    { label: "Project location", value: clean(row.location) || "Not provided" },
    { label: "Inquiry date and time", value: receivedAt },
    { label: "Website source", value: source },
    { label: "Product page URL", value: pageUrl, href: pageUrl },
  ];

  const extraSection = extras.length
    ? `<tr>
        <td class="email-pad" style="padding:0 32px 22px;">
          <h2 style="margin:0 0 10px;font-size:15px;line-height:22px;color:#001736;">Additional request details</h2>
          ${detailTable(extras)}
        </td>
      </tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(`New Product Quote Inquiry – ${subjectProduct}`)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-wrap { width: 100% !important; border-radius: 0 !important; }
        .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
        .email-heading { font-size: 23px !important; line-height: 29px !important; }
        .detail-label, .detail-value { display: block !important; width: 100% !important; box-sizing: border-box !important; }
        .detail-label { padding-bottom: 2px !important; border-bottom: 0 !important; }
        .detail-value { padding-top: 0 !important; padding-bottom: 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;color:#101116;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">New quote enquiry from ${escapeHtml(clean(row.name) || "a customer")} for ${escapeHtml(productName)}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" class="email-wrap" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 12px 32px rgba(0,23,54,.10);">
            <tr>
              <td class="email-pad" style="padding:28px 32px 26px;background:#001736;border-bottom:4px solid #f5d129;">
                <div style="font-size:11px;line-height:16px;letter-spacing:.22em;font-weight:700;color:#f5d129;">SOLARIOUS ENERGY</div>
                <h1 class="email-heading" style="margin:10px 0 6px;font-size:28px;line-height:34px;font-weight:700;color:#ffffff;">New product quote inquiry</h1>
                <p style="margin:0;font-size:14px;line-height:21px;color:rgba(255,255,255,.74);">A customer has requested a quotation from the Solarious website.</p>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:26px 32px 16px;">
                <div style="font-size:11px;line-height:16px;letter-spacing:.10em;text-transform:uppercase;font-weight:700;color:#667085;">Quotation requested for</div>
                <div style="margin-top:6px;font-size:22px;line-height:28px;font-weight:700;color:#001736;">${escapeHtml(productName)}</div>
                <div style="margin-top:6px;font-size:13px;line-height:19px;color:#667085;">Received ${escapeHtml(receivedAt)}</div>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:0 32px 22px;">
                ${detailTable(rows)}
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="padding:0 32px 22px;">
                <div style="padding:16px 18px;background:#f7f8fa;border:1px solid #e7eaf0;border-left:4px solid #f5d129;border-radius:7px;">
                  <div style="font-size:11px;line-height:17px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#667085;">Customer message</div>
                  <div style="margin-top:7px;font-size:14px;line-height:22px;color:#101116;word-break:break-word;">${escapeNewlines(message)}</div>
                </div>
              </td>
            </tr>
            ${extraSection}
            <tr>
              <td class="email-pad" style="padding:18px 32px;background:#f7f8fa;border-top:1px solid #e7eaf0;">
                <p style="margin:0 0 8px;font-size:12px;line-height:19px;color:#667085;">This notification was generated automatically by <a href="${escapeHtml(siteUrl || SITE_URL_FALLBACK)}" style="color:#075e54;text-decoration:none;">solariousenergy.com</a>. Reply to this email to contact the customer directly.</p>
                <p style="margin:0;font-size:12px;line-height:19px;color:#667085;">Solarious Energy · Clean Energy. Pure World!</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `New Product Quote Inquiry – ${subjectProduct}`,
    "",
    `Full name: ${clean(row.name) || "Not provided"}`,
    `Email address: ${customerEmail || "Not provided"}`,
    `Phone number: ${customerPhone || "Not provided"}`,
    `Company: ${clean(row.company) || "Not provided"}`,
    `Product name: ${productName}`,
    `Product ID: ${productId}`,
    `Product category: ${category}`,
    `Requested quantity: ${quantity}`,
    `Wattage / capacity: ${capacity}`,
    `Project location: ${clean(row.location) || "Not provided"}`,
    `Inquiry date and time: ${receivedAt}`,
    `Website source: ${source}`,
    `Product page URL: ${pageUrl}`,
    "",
    "Customer message:",
    message,
    ...(extras.length
      ? ["", "Additional request details:", ...extras.map((entry) => `${entry.label}: ${entry.value}`)]
      : []),
  ].join("\n");

  return {
    subject: `New Product Quote Inquiry – ${subjectProduct}`,
    html,
    text,
    pageUrl,
  };
}

/**
 * Deliver one quote notification.
 *
 * The enquiry is claimed atomically before sending, so an immediate send and a
 * retry sweep can never both deliver the same message. A sent notification is
 * terminal; failures remain retryable. This function never throws.
 */
export async function deliverQuoteNotification(inquiry, deps = {}) {
  const { Inquiry, Product, sendEmail, env = process.env, now = new Date() } = deps;
  if (!inquiry || !Inquiry || typeof sendEmail !== "function") {
    return { sent: false, status: "skipped", reason: "not_configured" };
  }

  const id = inquiry._id || inquiry.id;
  if (!id) return { sent: false, status: "skipped", reason: "missing_id" };
  if (inquiry.kind && inquiry.kind !== "quote") {
    return { sent: false, status: "skipped", reason: "not_a_quote" };
  }

  const current = asPlain(inquiry);
  if (current.quoteNotification?.status === "sent") {
    return { sent: false, status: "sent", skipped: true, reason: "already_sent" };
  }

  const config = quoteNotificationConfiguration(env);
  const token = randomUUID();
  const claimedAt = now instanceof Date ? now : new Date(now);
  const claimExpiresAt = new Date(claimedAt.getTime() + config.claimMs);

  let claim;
  try {
    claim = await Inquiry.findOneAndUpdate(
      {
        _id: id,
        kind: "quote",
        $or: [
          { "quoteNotification.status": "pending" },
          {
            "quoteNotification.status": "failed",
            "quoteNotification.attempts": { $lt: config.maxAttempts },
          },
          {
            "quoteNotification.status": "sending",
            "quoteNotification.claimExpiresAt": { $lte: claimedAt },
            "quoteNotification.attempts": { $lt: config.maxAttempts },
          },
        ],
      },
      {
        $set: {
          "quoteNotification.status": "sending",
          "quoteNotification.claimToken": token,
          "quoteNotification.claimExpiresAt": claimExpiresAt,
          "quoteNotification.lastAttemptAt": claimedAt,
        },
        $inc: { "quoteNotification.attempts": 1 },
      },
      { new: true },
    );
  } catch (error) {
    console.error("[quote:email:claim:error]", {
      code: String(error?.code || "CLAIM_FAILED").slice(0, 60),
    });
    return { sent: false, status: "pending", reason: "claim_failed" };
  }

  if (!claim) {
    return {
      sent: false,
      status: "pending",
      skipped: true,
      reason: "in_flight_or_exhausted",
    };
  }

  const claimed = asPlain(claim);
  const product = await resolveQuoteProduct(claimed, Product);
  const message = quoteInquiryEmail({
    inquiry: claimed,
    product,
    siteUrl: config.siteUrl,
    now: claimedAt,
  });

  let result;
  try {
    result = await sendEmail({
      to: config.recipients,
      ...message,
      ...(EMAIL_PATTERN.test(clean(claimed.email)) ? { replyTo: clean(claimed.email) } : {}),
    });
  } catch (error) {
    result = { sent: false, error: error?.code || "EMAIL_SEND_FAILED" };
  }

  const sent = result?.sent === true;
  const status = sent ? "sent" : result?.skipped ? "pending" : "failed";
  const lastError = sent
    ? ""
    : clean(result?.error || result?.reason || "EMAIL_SEND_FAILED").slice(0, 120);
  const attempts = Number(claimed.quoteNotification?.attempts || 1);

  try {
    await Inquiry.updateOne(
      { _id: id, "quoteNotification.claimToken": token },
      {
        $set: {
          quoteNotification: {
            status,
            attempts,
            lastAttemptAt: claimedAt,
            sentAt: sent ? claimedAt : claimed.quoteNotification?.sentAt,
            messageId: sent ? clean(result?.messageId).slice(0, 200) : "",
            lastError,
            recipient: config.recipients.join(","),
            claimToken: "",
            claimExpiresAt: null,
          },
        },
      },
    );
  } catch (error) {
    console.error("[quote:email:state:error]", {
      code: String(error?.code || "STATE_WRITE_FAILED").slice(0, 60),
    });
  }

  return {
    sent,
    status,
    attempts,
    provider: clean(result?.provider) || null,
    ...(sent ? {} : { reason: lastError }),
  };
}

/**
 * Retry queued quote notifications. Pending rows (for example SMTP was not
 * configured when the customer submitted) keep retrying until they send;
 * hard failures stop after the configured attempt budget.
 */
export async function retryPendingQuoteNotifications(deps = {}) {
  const { Inquiry, Product, sendEmail, env = process.env, now = new Date(), limit = 20 } = deps;
  if (!Inquiry || typeof Inquiry.find !== "function") {
    return { considered: 0, retried: 0, sent: 0, failed: 0 };
  }

  const config = quoteNotificationConfiguration(env);
  const staleAt = now instanceof Date ? now : new Date(now);
  const query = {
    kind: "quote",
    $or: [
      { "quoteNotification.status": "pending" },
      {
        "quoteNotification.status": "failed",
        "quoteNotification.attempts": { $lt: config.maxAttempts },
      },
      {
        "quoteNotification.status": "sending",
        "quoteNotification.claimExpiresAt": { $lte: staleAt },
        "quoteNotification.attempts": { $lt: config.maxAttempts },
      },
    ],
  };

  let queryBuilder = Inquiry.find(query);
  if (queryBuilder && typeof queryBuilder.sort === "function") {
    queryBuilder = queryBuilder.sort({ createdAt: 1 });
  }
  if (queryBuilder && typeof queryBuilder.limit === "function") {
    queryBuilder = queryBuilder.limit(limit);
  }
  const pending = (await queryBuilder) || [];

  let retried = 0;
  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const result = await deliverQuoteNotification(item, {
      Inquiry,
      Product,
      sendEmail,
      env,
      now,
    });
    if (!result.skipped) retried += 1;
    if (result.sent) sent += 1;
    else if (result.status === "failed") failed += 1;
  }
  return { considered: pending.length, retried, sent, failed };
}
