# AI Creative Studio and the weekly business activity report

Two admin capabilities were added on top of the existing platform. Both reuse the
infrastructure that already shipped (admin session auth, Cloudinary, Resend,
MongoDB, the protected cron pattern) instead of introducing parallel systems.

## 1. AI Creative Studio — `Marketing → AI Creative Studio`

### What the admin controls

| Control | Values | Notes |
| --- | --- | --- |
| Creative category | 13 catalogue values (Residential/Commercial/Industrial/Rooftop Solar, Solar Panel Products, Mono PERC, TOPCon, HJT, Bifacial Modules, Manufacturing, Solar Awareness, Promotional Campaign, Festival Campaign) | Legacy labels (`Festival`, `Electricity Savings`, `Awareness`, `Product Promo`) still resolve through the alias map so old records stay valid. |
| Campaign title | free text, 120 chars | stored as `campaignTitle` |
| Target audience | free text, 160 chars | pre-filled per category from `AUDIENCE_HINTS`, always editable |
| Creative purpose | free text with suggestions | stored as `purpose` |
| Language | English / Hindi / Marathi | passed to the copy model and the brand text renderer |
| Platform | Instagram / Facebook / LinkedIn / WhatsApp | also shapes the image prompt composition hint |
| Aspect ratio | 1:1, 4:5, 9:16, 16:9 | validated server-side against `ASPECT_RATIOS` |
| Custom instructions | 800 chars | appended to the provider prompt |
| Headline / caption / CTA / hashtags | admin-reviewed copy | never auto-published |

### Where the options live

`backend/services/creative-catalogue.mjs` is the single source of truth.
`lib/creative-options.ts` mirrors it for the browser and
`tests/creative-contract.test.mjs` fails the build if the two lists diverge, so the
interface can never offer a category the API rejects.

### Provider abstraction

`backend/services/image-providers.mjs` implements two providers behind one
interface:

* `stability` → `POST https://api.stability.ai/v2beta/stable-image/generate/{core|ultra}`
* `openai` → `POST https://api.openai.com/v1/images/generations` (`gpt-image-1`, `dall-e-3`)

`backend/services/image-generation.mjs` adds retries (408/429/5xx only), a 75 s
abort, a 12 MB response cap, prompt cap, and error classification into stable
codes (`PROVIDER_AUTHENTICATION_ERROR`, `PROVIDER_PAYMENT_REQUIRED`,
`PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, …). Provider error text is always
redacted before it reaches a log line or the browser — OpenAI, for example, echoes
the submitted key in its message.

An unknown provider/model or a missing key returns
`IMAGE_PROVIDER_CAPABILITY_UNSUPPORTED` / `IMAGE_PROVIDER_NOT_CONFIGURED` (503)
**without any network call**.

### Review workflow

Every creative is created with `reviewStatus: "pending"`. The studio can approve,
reject, favourite and save creatives to the library. Publishing copy stays a human
decision; nothing is posted to a social network by this feature.

History filters: category, platform, review status, saved-to-library, date range
and free text. Each row offers preview, download, regenerate, edit copy, copy,
WhatsApp share and delete with an explicit confirmation dialog.

### Optional daily drafts

`GET /api/cron/daily-creative` (and `POST /api/internal/daily-creative`) generate
1–3 drafts per day when the workflow is enabled in Admin. Rules enforced in
`backend/services/creative-workflow.mjs`:

* disabled by default (`Setting{key: "creativeWorkflow"}`);
* the daily target is clamped to 1–3 and defaults to 2;
* completed drafts for a day are never regenerated, a failed slot is retried;
* drafts are never published and never touch the weekly report path.

## 2. Weekly business activity report

`backend/services/weekly-report.mjs` builds the email from real database records:

* enquiries (contact, quote, product, project) with name, contact, category, date and status;
* new leads, pending follow-ups, resolved/closed counts;
* AI creatives generated, failed and awaiting review;
* document uploads;
* other admin activity from the protected audit log;
* a CSV attachment (formula-injection safe) and an empty-period message.

Subject: `Solarious Energy – Weekly Business Activity Report | 02 Jan 2026 – 09 Jan 2026`
(periods are whole seven-day windows in `Asia/Kolkata`).

### Endpoint contract

| Route | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/cron/weekly-report` | `Authorization: Bearer $CRON_SECRET` | Sends only when `nextScheduledAt` is due, then advances the schedule by seven days. |
| `POST /api/cron/weekly-report` | same | Identical handler, for platform schedulers that only support POST. |
| `GET /api/cron/enquiry-report` | same | Legacy alias kept for existing deployments. |
| `GET /api/cron/daily-creative` | same | Daily draft workflow (opt-in). |

`CRON_SECRET` is compared with `timingSafeEqual` on hashed buffers; an unset secret
rejects every request instead of authorising them. Both the browser cron route
(`app/api/cron/weekly-report/route.ts`) and the API use the same rule.

### Delivery tracking

Collection `EnquiryReportHistory` with a unique `periodKey`:

`reportType`, `periodStart`, `periodEnd`, `recipient`, `mode`, `status`,
`providerMessageId`, `sentAt`, `errorCode`, `errorSummary`, `errorMessage`,
`claimToken`, `lockExpiresAt`, `createdAt`, `updatedAt`.

The unique index on `periodKey` is what makes duplicate delivery impossible, even
when a manual send and a scheduled run race. `send-now` uses the period itself as
the key and answers `409 REPORT_ALREADY_SENT` unless `{resend: true}` is sent
explicitly.

## Reviewing the email design without credentials

`cd backend && npm run preview:report` renders the same builder used in
production with sample records and writes `docs/weekly-report-preview.html`.
It makes no database, network or provider call, so it is safe to run anywhere and
cannot be mistaken for a delivered report.

## Manual configuration still required

1. Verify the sending domain with the email provider and set
   `EMAIL_FROM="Solarious Energy <reports@solariousenergy.com>"` plus `EMAIL_API_KEY`.
2. Set `CRON_SECRET` on both the frontend and the API.
3. Set `IMAGE_PROVIDER`, `IMAGE_MODEL` and `IMAGE_API_KEY` for the studio.
4. Set `EMAIL_TO` (default `info@solariousenergy.com`).
5. Enable the schedule in **Admin → Settings → Weekly Business Activity Report**
   and enable the daily workflow in **Admin → Marketing → AI Creative Studio** if wanted.
