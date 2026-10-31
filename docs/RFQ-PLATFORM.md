# RFQ procurement platform — operations guide

This document covers the B2B Request-for-Quotation pipeline and the certification registry added to the existing Solarious site. It is written for whoever runs the deployment, not just for developers.

---

## 1. Reference numbers

Every accepted submission receives a server-generated reference:

```
SOL-RFQ-<year>-<sequence>
SOL-RFQ-2026-000001
```

- The year comes from `BUSINESS_TIMEZONE` (default `Asia/Kolkata`), so a request submitted late on 31 December IST is dated to the correct business year.
- Sequences are allocated by an atomic `findOneAndUpdate({ year }, { $inc: { sequence: 1 } }, { upsert: true })` against the `RfqCounter` collection. The unique index on `year` is what makes concurrent submissions safe.
- The browser never generates or guesses a reference. If allocation fails transiently it is retried three times before the request is rejected — the client cannot skip it.
- The counter can only move forward. Deleting an RFQ does not recycle its number, so a reference is always unambiguous in correspondence.

## 2. Priority classification

Priority is derived from the capacity tier, never supplied by the client:

| Capacity tier | Priority | Escalation |
| --- | --- | --- |
| Below 100 kW | Normal | Sales inbox |
| 100 kW – 500 kW | Normal | Sales inbox |
| 500 kW – 1 MW | Medium | Sales inbox |
| 1 MW – 5 MW | **High** | Sales + high-priority inbox + webhook |
| 5 MW – 25 MW | **High** | Sales + high-priority inbox + webhook |
| 25 MW+ Bulk Procurement | **High** | Sales + high-priority inbox + webhook |

`isHighPriority()` tests the tier's lower bound (`minKw >= 1000`), so the rule "1 MW and above" cannot drift from the table.

## 3. What happens on submission

1. **Validate.** `validateRfq()` normalises and caps every field, rejects malformed email/phone/GSTIN, enforces consent and returns per-field errors. Nothing is written before validation passes.
2. **De-duplicate.** An `Idempotency-Key` header (sent by the form) prevents double submits; a second guard rejects an identical company + tier + email inside a 10-minute window.
3. **Persist.** The RFQ is written with its reference, priority and empty notification state. *This happens before any email is attempted,* so a mail outage can never lose a lead.
4. **Notify.**
   - Customer confirmation (with a datasheet attached **only** when a published product for the requested technology actually has one).
   - Internal desk notice to `RFQ_NOTIFICATION_EMAIL`.
   - For ≥ 1 MW: high-priority alert to `HIGH_PRIORITY_EMAIL` (plus the sales inbox) with the mandatory sales actions, and a Slack/Teams webhook post.
5. **Record.** A `RfqEvent` row captures creation, status changes, assignments, notes and retries.

Each channel records `status` (`pending` / `sent` / `failed` / `not_configured`), `attempts` and `lastError` on the RFQ.

## 4. Failure handling

- Email and webhook senders never throw into the request path; they return `{ sent: false, error }`.
- A background sweep runs every 10 minutes over RFQs with failed notifications, retrying up to 5 times per record. Admins can also force a retry from the RFQ detail panel.
- Missing configuration is recorded as `not_configured`, which is deliberately distinct from `failed` so an unconfigured environment does not look like an outage.
- SMTP credentials and server banners are never logged; only the error code and command are recorded.

## 5. Email configuration

SMTP is preferred (Nodemailer). If SMTP is not configured, RFQ mail falls back to the existing Resend credentials, so a deployment that already sends the weekly report needs no new secret.

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=commercial@solariousenergy.com
SMTP_PASS=...
SMTP_FROM=Solarious Energy Procurement Desk <commercial@solariousenergy.com>
SMTP_REPLY_TO=commercial@solariousenergy.com

RFQ_NOTIFICATION_EMAIL=sales-leads@solariousenergy.com
HIGH_PRIORITY_EMAIL=sales-leads@solariousenergy.com,kam-utility@solariousenergy.com
# Optional override of the four default mandatory sales actions:
# RFQ_SALES_ACTIONS=Verify GSTIN and credit profile,Check production pipeline,Contact customer within 2 hours,Update the CRM deal record

# Optional Slack / Microsoft Teams incoming webhook (HTTPS only, never exposed to the browser)
# SLACK_WEBHOOK_URL=
```

Health check: `GET /api/health` includes `rfqNotifications: "configured" | "not_configured"`, and `GET /api/admin/rfq-analytics` reports which inboxes and webhook the backend can see.

**Domain and mail safety:** adding SMTP settings does not touch DNS. If you point `SMTP_USER` at a mailbox on the production domain, confirm the SPF/DKIM records already authorise that sender before sending real traffic — do not modify MX records as part of an application deploy.

## 6. Status workflow

`new → under_review → contacted → quotation_in_progress → quotation_sent → negotiation → won / lost / closed`

Status changes are validated against this list, recorded as events, and can carry an internal remark. RFQs are never hard-deleted from the admin UI — use `closed` — because the record is procurement evidence.

## 7. Admin surfaces

| Surface | Route | Notes |
| --- | --- | --- |
| RFQ & Leads tab | `/admin` → RFQ & Leads | Search by reference/company/contact, filter by status/priority/1 MW+, CSV export honouring filters, detail panel with assignment, follow-up date, internal notes, activity history and notification retry |
| Certifications tab | `/admin` → Certifications | Create/edit/delete records, link an uploaded certificate document, set verification status and validity |
| Analytics | `GET /api/admin/rfq-analytics` | Totals, by status/priority/tier, six-month trend (IST months), notification configuration |

Export: up to 5,000 rows per download, formula-injection protected (`=`, `+`, `-`, `@` are prefixed) and quoted per RFC 4180.

## 8. Certification honesty rules

The registry encodes the compliance policy in code rather than in editorial habit:

- A record can only be set to `verified` when a document is linked — the API rejects the save otherwise (`certifications.mjs` → `validateCertification`).
- If a record is somehow flagged `verified` without a document, the public projection demotes it to `pending`.
- The public response never includes `certificateNumber` or a document URL for unverified records.
- With no database records, the public page falls back to the four compliance *frameworks* (BIS, ALMM, IEC, ISO) marked "Documentation pending" — a framework is not a claim.

## 9. Testing

```bash
npm --prefix backend test     # 87 tests: domain, workflow, HTTP routes
node --test tests/*.test.mjs  # 42 tests: frontend contracts incl. option parity
```

`backend/routes/procurement-routes.test.mjs` mounts the real routers on Express with in-memory models, so validation, status codes, headers, rate limiting and auth guards are exercised over HTTP without a database.

## 10. Deployment notes

- The RFQ routes need MongoDB; `GET /api/health` reports `database: "connected"` only when the ping succeeds.
- Node.js hosting must support a **persistent** Express process (Render, Railway, VPS, or Hostinger plans with Node.js application support). Shared hosting that only serves PHP cannot run this API; the Next.js app can be hosted separately and pointed at the API with `BACKEND_API_URL`.
- `FRONTEND_ORIGINS` must list the exact browser origin(s) of the site, or CORS rejects the admin and RFQ proxies.
- Rate limiting is currently in-process (5 RFQ submissions per hour per client IP). Behind a single reverse proxy, set `trust proxy` appropriately and consider a shared store if you scale to multiple API instances — this is the open item also recorded in `API_AUDIT_REPORT.md`.
