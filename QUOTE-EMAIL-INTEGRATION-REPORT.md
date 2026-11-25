# Solarious Energy — Request a Quote Email Integration

Implementation report for the quote → `sales@solariousenergy.com` notification pipeline.

## 1. Files modified

| File | Change |
| --- | --- |
| `backend/services/quote-inquiry.mjs` | **New.** Quote email template, input sanitisation, product resolution, atomic delivery claim, failure/retry state machine, pending-notification sweep. |
| `backend/server.mjs` | Added quote-notification state to the existing `Inquiry` schema; rewrote `POST /api/inquiries` with validation, honeypot, idempotency, duplicate window, canonical product lookup, save-then-email delivery and queue response; extended the 10-minute retry sweep to quote notifications. |
| `backend/services/notifications.mjs` | Exposed the SMTP password to the internal transport builder (it was read but never passed to Nodemailer); added `MAIL_FROM` fallback; SMTP is only selected when a From address exists. |
| `backend/.env.example` | Documented `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_FROM`, `SMTP_REPLY_TO`, `SALES_EMAIL`, `PUBLIC_SITE_URL` and optional retry settings. No credentials included. |
| `backend/package.json` | `build` now syntax-checks the new service. |
| `components/product-enquiry-form.tsx` | Exact success message; stable per-form idempotency key so a timeout retry cannot create a second enquiry or email. |
| `components/quote-popup-form.tsx` | Exact success message. |
| `components/quote-wizard.tsx` | Exact success message. |
| `backend/services/quote-inquiry.test.mjs` | **New.** 7 unit tests for template, sanitisation, product resolution, send-once, failure/retry, concurrent claim, missing-SMTP behaviour. |
| `backend/services/quote-email-smtp.test.mjs` | **New.** End-to-end Nodemailer/SMTP transport test against a local SMTP sink. |

No product page layout, product imagery, catalogue content or admin UI was redesigned.

## 2. Backend API changes

`POST /api/inquiries` remains backward compatible for contact enquiries.

- `kind: "quote"` is stored exactly as before, then `deliverQuoteNotification()` runs **after** the record is saved. The request never waits for SMTP.
- Successful quote response:
  ```json
  { "ok": true, "id": "<inquiry id>", "notification": "queued" }
  ```
- Contact response remains `{ "ok": true, "id": "<inquiry id>" }`.
- Repeated `Idempotency-Key` returns `200 { ok: true, id, duplicate: true }` without storing or emailing again.
- `400 VALIDATION_ERROR` for missing name / email / phone / location / enquiry type, invalid email, invalid mobile, or a quote without a product description.
- `409 DUPLICATE_ENQUIRY` for the same `kind` + email/phone within 2 minutes.
- `429 RATE_LIMITED` remains 8 submissions per 15 minutes per IP.
- Honeypot field `website` returns a success-shaped response but stores and emails nothing.
- Client-supplied product names are replaced by the canonical `Product` record when `details.productSlug` or the product name matches the catalogue. Canonical name, model number, category and slug are then used in storage, the email and the product URL.

Delivery state is stored additively on the inquiry:

```text
quoteNotification: {
  status: "pending" | "sending" | "sent" | "failed",
  attempts, lastAttemptAt, sentAt, messageId, lastError,
  recipient, claimToken, claimExpiresAt
}
```

No collection migration is required; existing inquiries and all existing admin fields remain untouched.

## 3. SMTP configuration requirements

Set these in the **backend** environment (never in `NEXT_PUBLIC_*`):

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587                 # 465 for implicit TLS
SMTP_SECURE=false             # true for port 465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Solarious Energy <sales@solariousenergy.com>
MAIL_FROM=Solarious Energy <sales@solariousenergy.com>   # fallback if SMTP_FROM is empty
SALES_EMAIL=sales@solariousenergy.com
PUBLIC_SITE_URL=https://solariousenergy.com
```

Optional:

```dotenv
SMTP_REPLY_TO=
QUOTE_EMAIL_MAX_ATTEMPTS=12       # hard-failure retry budget
QUOTE_EMAIL_CLAIM_MS=900000       # 15-minute stale-claim recovery
```

No credentials are hard-coded in the repository. If SMTP is not configured, a quote is still stored and remains `pending`; the 10-minute sweep retries it after configuration is added. Resend (`EMAIL_API_KEY` + `EMAIL_FROM`) remains a fallback provider, but the intended quote path is SMTP.

> The missing SMTP credentials are the only reason real delivery to `sales@solariousenergy.com` cannot be proven in this sandbox. See section 6.

## 4. Email template details

- **Subject:** `New Product Quote Inquiry – [Product Name]` (en dash exactly as specified).
- **Reply-To:** customer email when valid, so sales can reply directly.
- **From:** `SMTP_FROM`, then `MAIL_FROM`, then `EMAIL_FROM`.
- **To:** `SALES_EMAIL` (comma-separated allowed); falls back to `sales@solariousenergy.com`.
- Responsive 640 px table layout, dark navy `#001736` header, Solarious yellow `#f5d129` accent, mobile stacking at 620 px.
- HTML and plain-text versions.
- Detail rows: Full name, Email, Phone, Company, Product name, Product ID/model, Product category, Quantity, Wattage/capacity, Project location, Inquiry date/time in `Asia/Kolkata` IST, Website source, Product page URL, additional form fields, and the customer message.
- All customer text is HTML-escaped; newlines are preserved safely; the page URL is generated from the canonical category + slug, not accepted blindly from the browser.

## 5. Admin compatibility

- The existing `Inquiry` collection, `GET /api/admin/inquiries`, `PATCH /api/admin/inquiries` and `DELETE /api/admin/inquiries` are unchanged.
- Existing records render unchanged; the new `quoteNotification` object is extra data the admin TypeScript shape does not depend on.
- Status updates (`new`, `contacted`, `qualified`, `closed`) still work because the patch only touches the top-level `status`.
- Existing contact enquiries do not trigger quote emails.
- No admin UI was altered. Delivery state can be inspected in MongoDB (`quoteNotification.status`, `lastError`, `sentAt`, `messageId`) without changing the panel.

## 6. Actual delivery test results

**Real delivery to `sales@solariousenergy.com` was NOT verified.** This environment has no MongoDB service and no SMTP credentials (`env` contains no `SMTP_*`, `SALES_EMAIL`, `MAIL_FROM` or `MONGODB_URI`). The deployed site is not reachable from the sandbox either. I therefore cannot claim a production email arrived, and a `201` response alone is not treated as proof.

What **was** verified:

- `cd backend && npm test` → **144 tests, 144 pass**.
- `node --test ./services/quote-inquiry.test.mjs` → **7/7 pass** (template content, escaping, responsive markers, recipient default, canonical product resolution, send-once, failure→retry, concurrent claim dedupe, missing-SMTP stays pending).
- `node --test ./services/quote-email-smtp.test.mjs` → **1/1 pass**. A real Nodemailer SMTP transport connected to a local SMTP sink, authenticated with test-only credentials, and delivered exactly one message to `sales@solariousenergy.com`; the captured message contained the customer name, message and Solarious footer. This proves the transport/template hand-off, **not** external mailbox delivery.
- `npm --prefix backend run build` → passes the full `node --check` chain.
- Root `npm run typecheck` → passes.
- Root `npm run build` → Next.js production build succeeds (21 static pages generated).
- Root `npm run lint` → 0 errors; 23 pre-existing warnings elsewhere in the repo.

Still unverified against a live database: product-page A/B submissions, actual persistence, actual delivery, live invalid-field responses, live duplicate responses and live admin listing. These require a running MongoDB + configured SMTP + deployment credentials.

## 7. Remaining configuration / operational steps

1. Provision real SMTP credentials for `sales@solariousenergy.com` (or an authenticated sending account) and set the backend variables in section 3. Do not put them in frontend env vars.
2. Set `SALES_EMAIL=sales@solariousenergy.com` and `PUBLIC_SITE_URL=https://solariousenergy.com`.
3. Restart the backend. The startup log reports the configured integrations (without secrets).
4. Submit a quote from one product page and one `/quote` form on the deployed site; confirm:
   - the inquiry appears in **Admin → All Enquiries**;
   - the email arrives at `sales@solariousenergy.com` with the correct subject, product name, ID/category, URL and customer fields;
   - `quoteNotification.status` is `sent`.
5. If SMTP is intentionally unavailable, the inquiry still saves and `quoteNotification.status` stays `pending`; the sweep retries every 10 minutes. Once credentials are added, pending records are picked up automatically.
6. If an operator sees `quoteNotification.status: "failed"`, inspect `lastError`; hard failures stop after `QUOTE_EMAIL_MAX_ATTEMPTS` (default 12), while `not_configured` rows stay pending.

**No commit or push was made in this turn.**
