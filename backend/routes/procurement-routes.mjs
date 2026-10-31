// Procurement platform routes: B2B RFQ pipeline and the certification registry.
// Collaborators are injected by server.mjs so the same handlers can be mounted in
// tests without a database.

import {
  CERTIFICATION_CATEGORIES,
  VERIFICATION_STATUSES,
  certificationStats,
  groupCertifications,
  publicCertification,
  validateCertification,
} from "../services/certifications.mjs";
import {
  DISPATCH_TIMELINES,
  MODULE_TECHNOLOGIES,
  PROJECT_TYPES,
  RFQ_STATUSES,
  RFQ_STATUS_IDS,
  VOLUME_TIERS,
  buildRfqCsv,
  dispatchTimelineLabel,
  locationLabel,
  moduleTechnologyLabel,
  projectTypeLabel,
  tierLabel,
} from "../services/rfq.mjs";
import { createRfq, deliverRfqNotifications } from "../services/rfq-workflow.mjs";

const csvFilename = () => `solarious-rfqs-${new Date().toISOString().slice(0, 10)}.csv`;

/** Build the Mongo filter for the admin RFQ list and CSV export. */
export function rfqFilter(query = {}) {
  const filter = {};
  if (query.status && RFQ_STATUS_IDS.includes(String(query.status))) filter.status = String(query.status);
  if (query.priority && ["Normal", "Medium", "High"].includes(String(query.priority))) filter.priority = String(query.priority);
  if (String(query.highPriority || "") === "true") filter.highPriority = true;
  if (query.projectType) filter.projectType = String(query.projectType);
  if (query.volumeTier) filter.volumeTier = String(query.volumeTier);
  if (query.assignedTo) filter.assignedTo = String(query.assignedTo);
  if (query.from || query.to) {
    filter.createdAt = {};
    const from = new Date(String(query.from || ""));
    const to = new Date(String(query.to || ""));
    if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (!Number.isNaN(to.getTime())) filter.createdAt.$lte = new Date(to.getTime() + 86_399_999);
  }
  const search = String(query.search || "").trim().slice(0, 80);
  if (search) {
    // Escape regex metacharacters: the admin search box must not be able to build
    // a pathological pattern.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { rfqReferenceId: { $regex: safe, $options: "i" } },
      { companyName: { $regex: safe, $options: "i" } },
      { fullName: { $regex: safe, $options: "i" } },
      { workEmail: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
    ];
  }
  return { query: filter };
}

/**
 * Register every procurement route.
 * @param {import("express").Express} app
 * @param {object} deps
 */
export function registerProcurementRoutes(app, deps) {
  const {
    admin,
    asyncRoute,
    id,
    adminUsername = "system",
    models: { Rfq, RfqCounter, RfqEvent, Product, Certification, ProtectedAudit },
    services: {
      sendEmail,
      sendWebhook,
      rfqNotificationConfiguration,
      notificationStatus,
    },
    rfqYear,
    ipHash = () => "",
    rateLimit = { limit: 5, windowMs: 60 * 60 * 1000 },
    logger = console,
  } = deps;

  const audit = async (action, details) => {
    if (!ProtectedAudit?.create) return;
    await ProtectedAudit.create({ action, actor: adminUsername, details }).catch(() => {});
  };

  const rfqDepsFresh = () => ({
    Rfq,
    RfqCounter,
    RfqEvent,
    Product,
    sendEmail,
    sendWebhook,
    config: rfqNotificationConfiguration(),
  });

  const rfqView = (row) => ({
    ...row,
    id: String(row._id),
    _id: undefined,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    targetLocation: row.targetLocation || {},
    volumeTierLabel: tierLabel(row.volumeTier),
    moduleTechnologyLabel: moduleTechnologyLabel(row.moduleTechnology),
    projectTypeLabel: projectTypeLabel(row.projectType),
    dispatchTimelineLabel: dispatchTimelineLabel(row.dispatchTimeline),
    targetLocationLabel: locationLabel(row.targetLocation),
    highPriority: Boolean(row.highPriority),
  });

  const logEvent = async (rfq, type, { actor = adminUsername, summary = "", detail = {} } = {}) => {
    await RfqEvent.create({ rfqId: String(rfq._id || rfq.id), type, actor, summary, detail }).catch((error) =>
      logger.error("[rfq:event:error]", { type, message: String(error?.message || "").slice(0, 120) }),
    );
  };

  // --- Public submission, rate limited per client -------------------------
  const submissions = new Map();
  const rfqRateLimit = (req, res, next) => {
    const key = String(req.ip || req.socket.remoteAddress || "anonymous");
    const now = Date.now();
    const hits = (submissions.get(key) || []).filter((time) => time > now - rateLimit.windowMs);
    if (hits.length >= rateLimit.limit) {
      return res.status(429).json({
        error: "Too many RFQ submissions from this connection. Please contact the sales desk directly.",
        code: "RFQ_RATE_LIMITED",
      });
    }
    hits.push(now);
    submissions.set(key, hits);
    next();
  };

  app.post(
    "/api/rfqs",
    rfqRateLimit,
    asyncRoute(async (req, res) => {
      const submissionKey = String(req.get("idempotency-key") || req.body?.submissionKey || "").trim().slice(0, 120);
      const result = await createRfq(
        {
          body: req.body,
          submissionKey,
          ipHash: ipHash(req.ip || req.socket.remoteAddress),
          year: rfqYear(),
        },
        rfqDepsFresh(),
      );
      if (result.status === 201) logger.log?.("[rfq:created]", { highPriority: result.body?.rfq?.priority === "High" });
      res.status(result.status).json(result.body);
    }),
  );

  // --- Admin pipeline -----------------------------------------------------
  app.get("/api/admin/rfqs/meta", admin, asyncRoute(async (_req, res) =>
    res.json({
      statuses: RFQ_STATUSES,
      projectTypes: PROJECT_TYPES,
      moduleTechnologies: MODULE_TECHNOLOGIES,
      dispatchTimelines: DISPATCH_TIMELINES,
      volumeTiers: VOLUME_TIERS.map(({ id: tierId, label, priority, minKw }) => ({ id: tierId, label, priority, minKw })),
      notifications: notificationStatus(),
    }),
  ));

  // Must be registered before /api/admin/rfqs/:id or it is shadowed.
  app.get("/api/admin/rfqs/export", admin, asyncRoute(async (req, res) => {
    const { query } = rfqFilter(req.query);
    const rows = await Rfq.find(query).sort({ createdAt: -1 }).limit(5000).lean();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${csvFilename()}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buildRfqCsv(rows));
  }));

  app.get("/api/admin/rfqs", admin, asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { query } = rfqFilter(req.query);
    const [rows, total] = await Promise.all([
      Rfq.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Rfq.countDocuments(query),
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ rfqs: rows.map(rfqView), total, page, limit, statuses: RFQ_STATUS_IDS });
  }));

  app.get("/api/admin/rfqs/:id", admin, asyncRoute(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id).lean();
    if (!rfq) return res.status(404).json({ error: "RFQ not found." });
    const events = await RfqEvent.find({ rfqId: String(rfq._id) }).sort({ createdAt: -1 }).limit(100).lean();
    res.setHeader("Cache-Control", "no-store");
    res.json({ rfq: rfqView(rfq), events: events.map((event) => ({ ...id(event), created_at: event.createdAt })) });
  }));

  app.patch("/api/admin/rfqs/:id/status", admin, asyncRoute(async (req, res) => {
    const status = String(req.body?.status || "");
    if (!RFQ_STATUS_IDS.includes(status)) return res.status(400).json({ error: "Select a valid RFQ status." });
    const remarks = typeof req.body?.internalRemarks === "string" ? req.body.internalRemarks.trim().slice(0, 2000) : undefined;
    const update = { status, ...(remarks !== undefined ? { internalRemarks: remarks } : {}) };
    const rfq = await Rfq.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!rfq) return res.status(404).json({ error: "RFQ not found." });
    await logEvent(rfq, "rfq.status", { summary: `Status set to ${status}`, detail: { status, previous: req.body?.previous || "" } });
    res.json({ ok: true, rfq: rfqView(rfq.toObject ? rfq.toObject() : rfq) });
  }));

  app.patch("/api/admin/rfqs/:id/assign", admin, asyncRoute(async (req, res) => {
    const assignedTo = String(req.body?.assignedTo || "").trim().slice(0, 120);
    const followUp = req.body?.followUpDate ? new Date(req.body.followUpDate) : null;
    if (followUp && Number.isNaN(followUp.getTime())) return res.status(400).json({ error: "Follow-up date is invalid." });
    const rfq = await Rfq.findByIdAndUpdate(
      req.params.id,
      { assignedTo, ...(followUp ? { followUpDate: followUp } : {}) },
      { new: true, runValidators: true },
    );
    if (!rfq) return res.status(404).json({ error: "RFQ not found." });
    await logEvent(rfq, "rfq.assigned", {
      summary: assignedTo ? `Assigned to ${assignedTo}` : "Assignment cleared",
      detail: { assignedTo, followUpDate: followUp },
    });
    res.json({ ok: true, rfq: rfqView(rfq.toObject ? rfq.toObject() : rfq) });
  }));

  app.post("/api/admin/rfqs/:id/notes", admin, asyncRoute(async (req, res) => {
    const note = String(req.body?.note || "").trim().slice(0, 2000);
    if (!note) return res.status(400).json({ error: "Enter a note before saving." });
    const rfq = await Rfq.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: "RFQ not found." });
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    rfq.internalRemarks = [rfq.internalRemarks, `[${stamp}] ${adminUsername}: ${note}`].filter(Boolean).join("\n").slice(-6000);
    if (typeof rfq.save === "function") await rfq.save();
    await logEvent(rfq, "rfq.note", { summary: note.slice(0, 200) });
    res.status(201).json({ ok: true, rfq: rfqView(rfq.toObject ? rfq.toObject() : rfq) });
  }));

  app.post("/api/admin/rfqs/:id/notifications/retry", admin, asyncRoute(async (req, res) => {
    const rfq = await Rfq.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: "RFQ not found." });
    await deliverRfqNotifications(rfq, rfqDepsFresh(), { force: true });
    const refreshed = await Rfq.findById(req.params.id).lean();
    await logEvent(rfq, "rfq.notifications.retried", { summary: "Notification delivery retried" });
    res.json({ ok: true, notifications: refreshed?.notifications || {} });
  }));

  app.get("/api/admin/rfq-analytics", admin, asyncRoute(async (_req, res) => {
    const [total, statusRows, priorityRows, tierRows, trend, recent] = await Promise.all([
      Rfq.countDocuments({}),
      Rfq.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Rfq.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Rfq.aggregate([{ $group: { _id: "$volumeTier", count: { $sum: 1 } } }]),
      Rfq.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Rfq.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    const byStatus = Object.fromEntries(RFQ_STATUS_IDS.map((status) => [status, 0]));
    for (const row of statusRows) if (row._id in byStatus) byStatus[row._id] = row.count;
    res.setHeader("Cache-Control", "no-store");
    res.json({
      total,
      byStatus,
      byPriority: Object.fromEntries(priorityRows.map((row) => [row._id || "Normal", row.count])),
      byTier: Object.fromEntries(tierRows.map((row) => [row._id || "unknown", row.count])),
      monthlyTrend: trend.map((row) => ({ month: row._id, count: row.count })),
      recent: recent.map(rfqView),
      notifications: notificationStatus(),
    });
  }));

  // --- Certification registry --------------------------------------------
  app.get("/api/certifications", asyncRoute(async (_req, res) => {
    const records = await Certification.find({ published: true }).sort({ category: 1, displayOrder: 1, name: 1 }).lean();
    res.setHeader("Cache-Control", "no-store");
    res.json({ categories: groupCertifications(records), stats: certificationStats(records), options: { categories: CERTIFICATION_CATEGORIES } });
  }));

  app.get("/api/admin/certifications", admin, asyncRoute(async (_req, res) => {
    const records = await Certification.find({}).sort({ category: 1, displayOrder: 1, name: 1 }).lean();
    res.setHeader("Cache-Control", "no-store");
    res.json({
      certifications: records.map((record) => ({ ...id(record), issuedAt: record.issuedAt, expiresAt: record.expiresAt })),
      stats: certificationStats(records),
      options: { categories: CERTIFICATION_CATEGORIES, verificationStatuses: VERIFICATION_STATUSES },
    });
  }));

  app.post("/api/admin/certifications", admin, asyncRoute(async (req, res) => {
    const { values, errors } = validateCertification(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: "Please correct the certification details.", code: "VALIDATION_ERROR", fields: errors });
    }
    const record = await Certification.create(values);
    await audit("certifications.create", { id: String(record._id), name: values.name, category: values.category });
    const plain = record.toObject ? record.toObject() : record;
    res.status(201).json({ ok: true, certification: { ...id(plain), public: publicCertification(plain) } });
  }));

  app.put("/api/admin/certifications/:id", admin, asyncRoute(async (req, res) => {
    const { values, errors } = validateCertification(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: "Please correct the certification details.", code: "VALIDATION_ERROR", fields: errors });
    }
    const record = await Certification.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: "Certification not found." });
    await audit("certifications.update", { id: String(record._id), name: values.name, verificationStatus: values.verificationStatus });
    const plain = record.toObject ? record.toObject() : record;
    res.json({ ok: true, certification: { ...id(plain), public: publicCertification(plain) } });
  }));

  app.delete("/api/admin/certifications/:id", admin, asyncRoute(async (req, res) => {
    const record = await Certification.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: "Certification not found." });
    await audit("certifications.delete", { id: String(record._id), name: record.name });
    res.json({ ok: true });
  }));
}
