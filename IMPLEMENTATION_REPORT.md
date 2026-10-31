# Implementation report — B2B procurement platform

Date: 2026-10-31 · Branch: `arena/1392af85-solariousbackend`

This report maps the delivered work to the master specification, records the verification that was actually run, and lists what remains. It follows the repository's existing audit convention (see `API_AUDIT_REPORT.md`): claims are separated into **verified**, **built but unverified at runtime**, and **not done**.

## 1. Starting point (Phase 1)

The repository is a **Next.js 16 App Router** frontend with an **Express 5** API in `backend/`, backed by MongoDB via Mongoose. It is not a React/Vite client + `server/src` layout, so per the project rules the existing structure was kept and extended rather than replaced.

Already present and reused: corporate design system and premium homepage, hero slider, product catalogue and detail pages, product datasheets with signed direct upload and `%PDF-` probing, gallery, events, team, resources/documents, site CMS settings, admin dashboard with eight modules, admin session auth, weekly enquiry report email, AI assistant, calculators, SEO routes.

Gaps against the specification:

- `/quote` was a five-step free-text form posting to `/api/inquiries` — no RFQ entities, no reference numbers, no priority, no sales pipeline.
- No `/certifications` page and no certification records.
- No SMTP/Nodemailer, no internal high-priority alert, no Slack/Teams webhook.
- No admin RFQ management, no lead export, no configurable performance metrics.

## 2. What was built

### RFQ domain (`backend/services/rfq.mjs`)

Single source of truth for option ids, validation, priority, references, CSV and email content.

- Tier table with `minKw`/`maxKw` and derived priority; `isHighPriority()` = tier lower bound ≥ 1000 kW.
- `validateRfq()` — normalises and caps every field, lower-cases email, strips phone formatting, validates GSTIN structure, enforces consent, returns per-field errors and a safe `values` object.
- `formatReference` / `parseReference` / `isReference` for `SOL-RFQ-YYYY-NNNNNN`.
- `buildRfqCsv()` with formula-injection protection; IST formatting for every timestamp.
- Email templates: customer confirmation, internal notice (< 1 MW), high-priority alert (≥ 1 MW), Slack-shaped webhook payload, and `datasheetForTechnology()` which returns a datasheet only when a published product for that technology genuinely has one.

### Persistence and delivery (`backend/services/rfq-workflow.mjs`, `backend/services/notifications.mjs`)

- `allocateReference()` with retry; `createRfq()` persisting **before** notifying, with idempotency key and 10-minute duplicate window.
- `deliverRfqNotifications()` records per-channel status/attempts/error and never throws; `retryPendingRfqs()` backs the 10-minute sweep (cap 5 attempts); `setRfqStatus()` validates transitions.
- `sendEmail()` prefers SMTP (Nodemailer), falls back to Resend, never logs credentials; `sendWebhook()` requires HTTPS and is skipped silently when unconfigured.

### Routes (`backend/routes/procurement-routes.mjs`)

`registerProcurementRoutes(app, deps)` mounts, with injected collaborators:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/rfqs` | rate limited (5/h/client), idempotency, returns only the public summary |
| GET | `/api/admin/rfqs` | filters: search, status, priority, 1 MW+, tier, assignee, date range; paginated |
| GET | `/api/admin/rfqs/meta` | option tables for the admin UI |
| GET | `/api/admin/rfqs/export` | CSV, 5,000 rows, honours filters, registered before `/:id` |
| GET | `/api/admin/rfqs/:id` | record + activity history |
| PATCH | `/api/admin/rfqs/:id/status` | validated transition + remark |
| PATCH | `/api/admin/rfqs/:id/assign` | assignee + follow-up date |
| POST | `/api/admin/rfqs/:id/notes` | timestamped internal notes |
| POST | `/api/admin/rfqs/:id/notifications/retry` | force re-delivery |
| GET | `/api/admin/rfq-analytics` | totals, by status/priority/tier, 6-month trend, notification config |
| GET | `/api/certifications` | public registry, unverified records stripped of numbers/documents |
| GET/POST/PUT/DELETE | `/api/admin/certifications` | CRUD with audit writes for create/update/delete |

Admin search regex input is escaped and length-capped, closing the ReDoS finding from the audit for this endpoint.

### Certifications (`backend/services/certifications.mjs`)

Category table (BIS, ALMM, IEC, ISO), validation, `publicCertification()` projection, grouping and stats. Verification is enforced, not advised: `verified` requires a linked document, and a record that claims `verified` without one is demoted publicly.

### Frontend

- `app/certifications/page.tsx` — compliance page with per-record verification chips, standards, scope, audit relevance, validity and document links; explicit "documentation pending" state and a verification-policy summary.
- `lib/certifications.ts` — server loader plus framework fallbacks and homepage metric defaults.
- `components/rfq-wizard.tsx` + `lib/rfq-options.ts` — eight-step RFQ flow (stakeholder → application → capacity → technology → timeline → technical → location → review/consent) with per-field validation, high-priority reassurance note, one idempotency key per form session and a receipt screen showing the server reference.
- `/quote` now renders the RFQ wizard instead of the free-text form.
- `components/admin-rfq.tsx` — pipeline table, filters, trend chart, export, detail panel (status, assignment, follow-up, notes, activity, notification retry).
- `components/admin-certifications.tsx` — record management with document linking.
- `app/page.tsx` — performance-metric band and compliance ribbon, both driven by backend data with "indicative" labelling until an admin marks the metrics verified.
- `app/compliance-rfq.css` — responsive styles for all of the above (desktop 1920 → mobile 375).
- Nav and footer links to `/certifications`; sitemap entry added.

### Configuration

`backend/.env.example` gained the SMTP, RFQ routing and webhook groups; `ENVIRONMENT.md` documents each variable with its consumer. No credential is committed.

## 3. Verification actually performed

| Check | Command | Result |
| --- | --- | --- |
| Backend unit + HTTP tests | `npm --prefix backend test` | **87 passed** (34 RFQ domain/workflow, 10 certifications, 15 HTTP route tests, 28 pre-existing) |
| Frontend contract tests | `node --test tests/*.test.mjs` | **42 passed** (7 new RFQ/certification contracts, 35 pre-existing) |
| Type check | `tsc --noEmit` | clean |
| Lint | `eslint` on all new/changed files | clean |
| Production build | `npm run build` | succeeds; 31 routes, `/certifications` dynamic |
| Live pages | `next start` + curl | `/`, `/quote`, `/certifications`, `/products`, `/quality`, `/sitemap.xml` → 200; `/admin` → 307 to sign-in |

Critical RFQ cases from the specification, mapped to executable tests:

| Spec case | Covered by |
| --- | --- |
| Below 100 kW · 500 kW–1 MW · 1–5 MW · 5–25 MW · 25 MW+ | `rfq.test.mjs` priority table; `rfq-workflow.test.mjs` escalation matrix |
| Invalid email / phone / missing fields / missing consent | `rfq.test.mjs` validation group; HTTP 400 with `fields` |
| Duplicate submission | workflow idempotency + dedupe-window tests; HTTP 200 duplicate test |
| Failed email service | workflow "email outage never loses the RFQ"; retry sweep tests |
| Unauthorized admin access | HTTP tests assert 401 on all admin RFQ/certification routes |
| Unique reference generation | `allocateReference` concurrency-shaped tests + HTTP reference format assertion |
| Webhook failure handling | workflow + HTTP retry test (`WEBHOOK_TIMEOUT` → retried to `sent`) |
| CSV export | domain escaping test + HTTP content-type/disposition test |

## 4. Built but not verified at runtime here

This sandbox has no MongoDB and cannot reach `fastdl.mongodb.org`, so no `mongod` could be started. Consequences:

- The **live preview** renders the marketing site, `/certifications` (framework fallback state) and the RFQ wizard, but an actual submission returns the API's documented `503` "Database is temporarily unavailable" because the database guard runs before the handler. This is the guard behaving correctly, not a code defect.
- Mongo-backed behaviour — reference counter, indexes, aggregation, persistence — is exercised against in-memory fakes through the **real routers**, not against a real server. The queries themselves (indexes, `$regex`, `$dateToString` aggregation) are reviewed but not executed.
- Email delivery was verified through injected transports, not a real SMTP handshake; webhook delivery likewise (HTTPS-only path enforced).

To finish verification on a machine with MongoDB:

```bash
cp backend/.env.example backend/.env   # set MONGODB_URI, ADMIN_*, SMTP_*, RFQ_* inboxes
npm --prefix backend start &
npm run build && npm start
npm --prefix backend run test:smoke    # session-auth smoke test
# then submit one RFQ per tier and check /admin → RFQ & Leads
```

## 5. Not implemented from the specification

These were intentionally left out rather than half-built; the existing product already covers parts of them:

1. **Multi-user admin with bcrypt + JWT + roles** (Super Admin / Sales Manager / Sales Executive / Content Manager) and password reset. The existing single-credential, HMAC-signed HttpOnly cookie session remains. This is a real gap: sales execs cannot be scoped, and `API_AUDIT_REPORT.md` H1 (no login throttling) still applies.
2. **Four-category mega menu** (Solutions / Capabilities / Tools / Company) at 68–76 px with a 44 px logo. The existing header (Solutions/Products dropdowns, quotes modal, mobile sheet) was preserved instead of redesigned — a UI change that should be reviewed visually before shipping.
3. **Product detail page additions** (electrical/mechanical/performance tabs, related products) — the existing detail page already renders specifications, datasheets and related products; no duplicate was created.
4. **Slack vs Teams payload variants** — one Slack-shaped payload is sent, which Teams incoming webhooks also accept.
5. **Excel export** — CSV only (Excel opens it natively).

## 6. Known limitations and follow-ups

- **Admin login throttling** is still missing (`API_AUDIT_REPORT.md` H1) and now matters more, because the admin surface includes customer PII from RFQs.
- **Rate limiters are in-process**, so limits reset on restart and are per-instance. The proxy/`trust proxy` issue from H2 still applies to RFQ throttling.
- **`projectNotes` and `specificationRequirements`** are both free text; the admin detail panel shows them separately but there is no structured BoM capture.
- The homepage metric band ships with the specification's figures marked **indicative** until an admin verifies them via `PUT /api/admin/settings/performanceMetrics` — by design, no unverified claim is presented as certified.
- Certification seed data is deliberately absent: the page shows frameworks only until real certificates are uploaded.
- **Visual QA was not performed with a device/browser matrix.** Responsive behaviour is implemented through explicit breakpoints (900 px, 640 px, 560 px) and reviewed in CSS, but must be checked visually at 1920 / 1366 / 768 / 375 / 430 px before launch. Accessibility was implemented (labels, `aria-invalid`, `role="alert"`, progress semantics, focusable dialog shells) but not audited with a screen reader.
- The eight-step wizard is longer than the five-step form it replaces; drop-off should be measured after launch.
