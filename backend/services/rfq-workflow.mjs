// RFQ persistence and notification pipeline.
// All collaborators (models, mailer, webhook) are injected so the workflow can be
// unit-tested with fakes and swapped without touching Express.

import {
  RFQ_STATUS_IDS,
  datasheetForTechnology,
  formatReference,
  highPriorityWebhookPayload,
  rfqConfirmationEmail,
  rfqInternalNoticeEmail,
  rfqPriorityAlertEmail,
  validateRfq,
  volumeTier,
} from "./rfq.mjs";

const noop = () => {};

export class RfqValidationError extends Error {
  constructor(fields) {
    super("Please correct the highlighted fields.");
    this.name = "RfqValidationError";
    this.code = "VALIDATION_ERROR";
    this.status = 400;
    this.fields = fields;
  }
}

/**
 * Allocate the next `SOL-RFQ-<year>-<seq>` reference.
 * Retries transient counter failures; the unique index on the counter document is
 * what makes concurrent submissions safe.
 */
export async function allocateReference({ RfqCounter, year, attempts = 3 }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const counter = await RfqCounter.findOneAndUpdate(
        { year },
        { $inc: { sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      const sequence = Number(counter?.sequence || 0);
      if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Counter returned an invalid sequence");
      return { reference: formatReference(year, sequence), year, sequence };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function recordEvent({ RfqEvent }, rfq, type, { actor = "system", summary = "", detail = {} } = {}) {
  if (!RfqEvent) return;
  try {
    await RfqEvent.create({ rfqId: String(rfq._id || rfq.id), type, actor, summary, detail });
  } catch {
    // Event history is best-effort; it must never fail an RFQ operation.
  }
}

const notificationState = (result) => ({
  status: result.sent ? "sent" : result.skipped ? "not_configured" : "failed",
  lastError: String(result.error || result.reason || "").slice(0, 120),
  updatedAt: new Date(),
});

/**
 * Deliver the customer confirmation, internal desk notice and (for >= 1 MW)
 * webhook alert. Never throws: failures are recorded on the RFQ for retry.
 */
export async function deliverRfqNotifications(rfq, deps, { force = false } = {}) {
  const { Rfq, Product, sendEmail, sendWebhook, config } = deps;
  const reference = rfq.rfqReferenceId;
  const current = (await Rfq.findOne({ rfqReferenceId: reference }).lean()) || rfq;
  const plain = typeof current.toObject === "function" ? current.toObject() : current;
  const highPriority = Boolean(plain.highPriority);
  const state = plain.notifications || {};
  const update = {};

  if (force || state.customer?.status !== "sent") {
    let datasheet = null;
    try {
      const products = typeof Product?.find === "function" ? await Product.find({ published: { $ne: false } }).lean() : [];
      datasheet = datasheetForTechnology(plain.moduleTechnology, products);
    } catch {
      datasheet = null;
    }
    const message = rfqConfirmationEmail({ rfq: plain, datasheet });
    const result = await sendEmail({
      to: plain.workEmail,
      ...message,
      attachments: datasheet
        ? [{ filename: `${plain.moduleTechnology || "solarious"}-datasheet.pdf`, path: datasheet.url }]
        : undefined,
    });
    update["notifications.customer"] = { ...notificationState(result), attempts: (state.customer?.attempts || 0) + 1 };
  }

  const salesInbox = config?.salesInbox || [];
  const highPriorityInbox = config?.highPriorityInbox || [];
  const recipients =
    highPriority && highPriorityInbox.length ? [...new Set([...highPriorityInbox, ...salesInbox])] : salesInbox;

  if ((force || state.internal?.status !== "sent") && recipients.length) {
    const message = highPriority
      ? rfqPriorityAlertEmail({ rfq: plain, salesActions: config?.salesActions || [] })
      : rfqInternalNoticeEmail({ rfq: plain });
    const result = await sendEmail({ to: recipients, ...message, replyTo: plain.workEmail });
    update["notifications.internal"] = { ...notificationState(result), attempts: (state.internal?.attempts || 0) + 1 };
  }

  if ((force || state.webhook?.status !== "sent") && config?.webhookConfigured && highPriority) {
    const result = await sendWebhook(highPriorityWebhookPayload({ rfq: plain }));
    update["notifications.webhook"] = { ...notificationState(result), attempts: (state.webhook?.attempts || 0) + 1 };
  }

  if (Object.keys(update).length) {
    await Rfq.updateOne({ _id: plain._id }, { $set: update }).catch(noop);
  }
  return update;
}

/**
 * Create an RFQ from an untrusted request body.
 * Returns `{ status, body }` so the route stays a thin adapter.
 */
export async function createRfq(input, deps) {
  const { Rfq, RfqCounter, RfqEvent, body, submissionKey = "", ipHash = "", year, dedupeWindowMs = 10 * 60 * 1000 } = {
    ...deps,
    ...input,
  };

  const { values, errors, priority, highPriority } = validateRfq(body);
  if (Object.keys(errors).length) throw new RfqValidationError(errors);

  if (submissionKey) {
    const existing = await Rfq.findOne({ submissionKey }).lean();
    if (existing) return { status: 200, body: { ok: true, duplicate: true, rfq: publicSummary(existing) } };
  }

  const recent = await Rfq.findOne({
    workEmail: values.workEmail,
    companyName: values.companyName,
    volumeTier: values.volumeTier,
    createdAt: { $gt: new Date(Date.now() - dedupeWindowMs) },
  }).lean();
  if (recent) {
    return {
      status: 200,
      body: {
        ok: true,
        duplicate: true,
        rfq: publicSummary(recent),
        notice: "A matching RFQ was already received. Our desk is reviewing it.",
      },
    };
  }

  const reference = await allocateReference({ RfqCounter, year });
  const rfq = await Rfq.create({
    rfqReferenceId: reference.reference,
    year: reference.year,
    sequence: reference.sequence,
    ...values,
    priority,
    highPriority,
    submissionKey,
    sourceIpHash: ipHash,
  });

  await recordEvent(deps, rfq, "rfq.created", {
    summary: `RFQ submitted (${priority} priority)`,
    detail: {
      volumeTier: values.volumeTier,
      moduleTechnology: values.moduleTechnology,
      projectType: values.projectType,
    },
  });

  // Notifications run only after the record exists so a mail outage cannot lose the RFQ.
  await deliverRfqNotifications(rfq, deps).catch(noop);

  return { status: 201, body: { ok: true, rfq: publicSummary(rfq) } };
}

function publicSummary(rfq) {
  const tier = volumeTier(rfq.volumeTier);
  return {
    rfqReferenceId: rfq.rfqReferenceId,
    companyName: rfq.companyName,
    fullName: rfq.fullName,
    workEmail: rfq.workEmail,
    volumeTier: rfq.volumeTier,
    volumeTierLabel: tier?.label || "",
    moduleTechnology: rfq.moduleTechnology,
    projectType: rfq.projectType,
    dispatchTimeline: rfq.dispatchTimeline,
    priority: rfq.priority,
    status: rfq.status,
    createdAt: rfq.createdAt,
  };
}

/** Retry undelivered notifications; bounded so a bad provider cannot spin forever. */
export async function retryPendingRfqs(deps, { limit = 20, maxAttempts = 5 } = {}) {
  const { Rfq } = deps;
  const pending = await Rfq.find({
    $or: [
      { "notifications.customer.status": "failed" },
      { "notifications.internal.status": "failed" },
      { "notifications.webhook.status": "failed" },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);
  let retried = 0;
  for (const rfq of pending) {
    const attempts = Math.max(
      rfq.notifications?.customer?.attempts || 0,
      rfq.notifications?.internal?.attempts || 0,
      rfq.notifications?.webhook?.attempts || 0,
    );
    if (attempts >= maxAttempts) continue;
    await deliverRfqNotifications(rfq, deps).catch(noop);
    retried += 1;
  }
  return { retried, considered: pending.length };
}

/** Status transition used by both the admin panel and future automations. */
export async function setRfqStatus(deps, id, { status, actor = "admin", internalRemarks }) {
  const { Rfq } = deps;
  if (!RFQ_STATUS_IDS.includes(String(status))) {
    return { status: 400, body: { error: "Select a valid RFQ status." } };
  }
  const update = { status };
  if (typeof internalRemarks === "string") update.internalRemarks = internalRemarks.trim().slice(0, 2000);
  const rfq = await Rfq.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!rfq) return { status: 404, body: { error: "RFQ not found." } };
  await recordEvent(deps, rfq, "rfq.status", { actor, summary: `Status set to ${status}`, detail: { status } });
  return { status: 200, body: { ok: true, rfq: typeof rfq.toObject === "function" ? rfq.toObject() : rfq } };
}
