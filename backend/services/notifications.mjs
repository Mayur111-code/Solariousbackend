// Transactional email (SMTP via Nodemailer) and internal webhook delivery for RFQs.
// Resend keeps working for the weekly enquiry report; RFQ mail prefers SMTP and
// falls back to Resend so an existing deployment does not need new credentials.

import nodemailer from "nodemailer";

const clean = (value) => String(value ?? "").trim();

const parseRecipients = (value, fallback = []) => {
  const list = String(value ?? "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
};

export function smtpConfiguration() {
  const host = clean(process.env.SMTP_HOST);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587,
    user,
    configured: Boolean(host && user && pass),
    secure: clean(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465,
    from: clean(process.env.SMTP_FROM) || clean(process.env.EMAIL_FROM) || "",
    replyTo: clean(process.env.SMTP_REPLY_TO) || clean(process.env.RFQ_REPLY_TO),
  };
}

export function rfqNotificationConfiguration() {
  const smtp = smtpConfiguration();
  const resendKey = clean(process.env.EMAIL_API_KEY);
  const provider = smtp.configured ? "smtp" : resendKey && smtp.from ? "resend" : "none";
  return {
    provider,
    configured: provider !== "none",
    from: smtp.from,
    replyTo: smtp.replyTo,
    salesInbox: parseRecipients(process.env.RFQ_NOTIFICATION_EMAIL, []),
    highPriorityInbox: parseRecipients(process.env.HIGH_PRIORITY_EMAIL, []),
    salesActions: parseRecipients(process.env.RFQ_SALES_ACTIONS, []),
    webhookUrl: clean(process.env.SLACK_WEBHOOK_URL),
    webhookConfigured: Boolean(clean(process.env.SLACK_WEBHOOK_URL)),
    smtpHost: smtp.host || null,
    smtpPort: smtp.port,
  };
}

let cachedTransport = null;
let cachedTransportKey = "";

function smtpTransport() {
  const smtp = smtpConfiguration();
  if (!smtp.configured) return null;
  const key = `${smtp.host}:${smtp.port}:${smtp.user}`;
  if (!cachedTransport || cachedTransportKey !== key) {
    cachedTransport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    cachedTransportKey = key;
  }
  return cachedTransport;
}

const failure = (message, code, status = 502) =>
  Object.assign(new Error(message), { code, status, stage: "email" });

async function sendViaResend({ to, subject, html, text, replyTo, attachments }) {
  const apiKey = clean(process.env.EMAIL_API_KEY);
  const from = clean(process.env.SMTP_FROM) || clean(process.env.EMAIL_FROM);
  if (!apiKey || !from) throw failure("Email delivery is not configured.", "EMAIL_NOT_CONFIGURED", 503);
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length
          ? { attachments: attachments.map(({ filename, path }) => ({ filename, path })) }
          : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw failure("The email provider could not be reached.", "EMAIL_PROVIDER_UNAVAILABLE", 503);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw failure(
      response.status === 429 ? "The email provider rate limit was reached." : "The email provider rejected the message.",
      response.status === 429 ? "EMAIL_RATE_LIMITED" : "EMAIL_REJECTED",
      response.status === 429 ? 429 : 502,
    );
  return { messageId: String(body.id || ""), provider: "resend" };
}

/**
 * Send one transactional message. Returns `{ sent, provider, messageId, error }`
 * instead of throwing: RFQ records must never be lost because a mail server is down.
 */
export async function sendEmail({ to, subject, html, text, replyTo, attachments, bcc }) {
  const config = rfqNotificationConfiguration();
  const recipients = (Array.isArray(to) ? to : [to]).map(clean).filter(Boolean);
  if (!recipients.length) return { sent: false, skipped: true, reason: "no_recipients" };
  if (!config.configured) return { sent: false, skipped: true, reason: "not_configured" };

  if (config.provider === "smtp") {
    const transport = smtpTransport();
    try {
      const info = await transport.sendMail({
        from: config.from,
        to: recipients,
        ...(bcc?.length ? { bcc } : {}),
        subject,
        html,
        text,
        ...(replyTo || config.replyTo ? { replyTo: replyTo || config.replyTo } : {}),
        ...(attachments?.length ? { attachments } : {}),
      });
      return { sent: true, provider: "smtp", messageId: String(info.messageId || "") };
    } catch (error) {
      // Never surface SMTP credentials or full server banners in logs.
      const code = String(error?.code || "SMTP_SEND_FAILED").slice(0, 60);
      console.error("[rfq:email:smtp:error]", { code, command: String(error?.command || "").slice(0, 20) });
      return { sent: false, provider: "smtp", error: code };
    }
  }

  try {
    const result = await sendViaResend({ to: recipients, subject, html, text, replyTo, attachments });
    return { sent: true, ...result };
  } catch (error) {
    console.error("[rfq:email:resend:error]", { code: error?.code || "EMAIL_FAILED", status: error?.status || 502 });
    return { sent: false, provider: "resend", error: error?.code || "EMAIL_FAILED" };
  }
}

/**
 * POST a structured payload to the configured Slack / Teams webhook.
 * A missing or failing webhook is reported, never thrown.
 */
export async function sendWebhook(payload, { timeoutMs = 8000 } = {}) {
  const url = clean(process.env.SLACK_WEBHOOK_URL);
  if (!url) return { sent: false, skipped: true, reason: "not_configured" };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { sent: false, error: "INVALID_WEBHOOK_URL" };
  }
  if (parsed.protocol !== "https:") return { sent: false, error: "WEBHOOK_REQUIRES_HTTPS" };
  try {
    const response = await fetch(parsed, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.error("[rfq:webhook:error]", { status: response.status });
      return { sent: false, status: response.status, error: "WEBHOOK_REJECTED" };
    }
    return { sent: true, status: response.status };
  } catch (error) {
    console.error("[rfq:webhook:error]", { name: error?.name || "Error", detail: String(error?.message || "").slice(0, 120) });
    return { sent: false, error: error?.name === "TimeoutError" ? "WEBHOOK_TIMEOUT" : "WEBHOOK_UNREACHABLE" };
  }
}

/** Redacted view of the notification setup for the admin dashboard. */
export function notificationStatus() {
  const config = rfqNotificationConfiguration();
  return {
    emailProvider: config.provider,
    emailConfigured: config.configured,
    from: config.from || null,
    salesInbox: config.salesInbox,
    highPriorityInbox: config.highPriorityInbox,
    webhookConfigured: config.webhookConfigured,
  };
}
