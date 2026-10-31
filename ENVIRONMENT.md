# Environment configuration

Copy `.env.example` to `.env.local` for the Next.js app and `backend/.env.example` to `backend/.env` for the API. Never place backend credentials in a `NEXT_PUBLIC_*` variable or commit either real environment file.

| Variable | Application | Required | Purpose | Used in |
| --- | --- | --- | --- | --- |
| `BACKEND_API_URL` | Frontend server | Yes | HTTPS origin for server-side API forwarding and admin sign-in. No `/api` suffix. | `lib/server-config.ts`, API routes |
| `VITE_API_URL` | Frontend server | Optional | Backward-compatible fallback for `BACKEND_API_URL`. | `lib/server-config.ts` |
| `NEXT_PUBLIC_SITE_URL` | Frontend/public | Yes in production | Canonical public site URL for metadata, sitemap, and robots. | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| `FRONTEND_ORIGINS` | Frontend server | Required for admin proxy writes in production | Comma-separated canonical browser origins trusted by the Next API proxy. Do not derive this from Host headers. | `app/api/[...path]/route.ts`, `lib/server-config.ts` |
| `CRON_SECRET` | Frontend server and backend | Yes when reports are scheduled | Shared bearer secret compared in constant time by both the Next cron proxies and `GET|POST /api/cron/weekly-report` on the API. Unset means every cron request is rejected. | `lib/cron-auth.ts`, `app/api/cron/weekly-report/route.ts`, `backend/server.mjs` |
| `MONGODB_URI` | Backend | Yes | MongoDB/Atlas connection URI. | `backend/db.mjs`, server startup and migration |
| `DB_NAME` | Backend | Optional | Database name; defaults to `solarious`. | `backend/db.mjs`, migrations |
| `PORT` | Backend | Optional | HTTP listening port; defaults to `4000`. | `backend/server.mjs` |
| `FRONTEND_ORIGINS` | Backend | Yes | Comma-separated CORS allow-list of frontend origins. | `backend/server.mjs` |
| `BUSINESS_TIMEZONE` | Backend | Optional | Daily Creative business timezone; defaults to `Asia/Kolkata`. | `backend/server.mjs` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Backend | Yes | Admin session authentication credentials. | `backend/server.mjs` |
| `CLOUDINARY_URL` | Backend | Yes in production | Cloudinary storage credentials in URL form. | `backend/services/cloudinary.mjs` |
| `LOCAL_UPLOADS_ENABLED` | Backend | Optional | Enables local uploads outside production only. | `backend/server.mjs` |
| `IMAGE_PROVIDER`, `IMAGE_MODEL`, `IMAGE_API_KEY` | Backend | Required for Creative Studio | Image provider switch: `stability` (`core`/`ultra`) or `openai` (`gpt-image-1`/`dall-e-3`). An unknown provider reports `unsupported` in `/api/health`. | `backend/services/image-providers.mjs`, `backend/services/image-generation.mjs` |
| `FESTIVAL_TEMPLATE_FALLBACK` | Backend | Optional | Enables a deterministic image only after a retryable image-provider outage; never for auth/billing failures. | `backend/services/image-generation.mjs` |
| `APINEX_API_KEY`, `APINEX_BASE_URL`, `APINEX_MODEL` | Backend | Optional | Marketing copy AI configuration. | `backend/services/ai.mjs` |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `REPORT_CONTACT_EMAIL` | Backend | Optional | Email transport for the weekly business activity report (Resend today; sender must be a verified domain address). `EMAIL_TO` sets the default recipient, `REPORT_CONTACT_EMAIL` the footer contact when no company profile is stored. | `backend/services/enquiry-report.mjs`, `backend/services/weekly-report.mjs` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_REPLY_TO` | Backend | Yes for RFQ email | SMTP transport for RFQ confirmations and internal alerts. When absent, RFQ mail falls back to `EMAIL_API_KEY`/`EMAIL_FROM` (Resend). | `backend/services/notifications.mjs` |
| `RFQ_NOTIFICATION_EMAIL` | Backend | Yes for RFQ desk alerts | Comma-separated sales inbox that receives every RFQ. | `backend/services/notifications.mjs` |
| `HIGH_PRIORITY_EMAIL` | Backend | Yes for >= 1 MW escalation | Comma-separated recipients added for RFQs of 1 MW and above. | `backend/services/notifications.mjs` |
| `RFQ_SALES_ACTIONS` | Backend | Optional | Overrides the default mandatory sales actions listed in the high-priority alert. | `backend/services/notifications.mjs` |
| `SLACK_WEBHOOK_URL` | Backend | Optional | HTTPS Slack/Teams incoming webhook posted for RFQs of 1 MW and above. Never exposed to the browser. | `backend/services/notifications.mjs` |
| `LOCAL_MONGODB_URI`, `ATLAS_MONGODB_URI`, `ATLAS_EXPECTED_HOST`, `MIGRATION_BACKUP_DIR` | Backend migration | Migration only | Local-to-Atlas migration inputs and backup location. | `backend/scripts/migrate-local-mongodb-to-atlas.mjs` |
| `PUBLIC_SITE_URL` | Backend migration | Migration only | Public site URL used by the production CMS migration. | `backend/scripts/migrate-production-cms.mjs` |
| `API_BASE_URL`, `SMOKE_TEST_ORIGIN` | Backend test | Test only | API target and allowed Origin for the smoke-test script. | `backend/scripts/smoke-test.mjs` |

## Weekly report scheduling

The report itself is timezone-aware: periods are always whole seven-day windows in `Asia/Kolkata` and every run is recorded in `EnquiryReportHistory` with a unique `periodKey`, so a period can never be emailed twice.

| Hosting | How to schedule | Notes |
| --- | --- | --- |
| Vercel | `vercel.json` → `crons` (daily `03:30 UTC`, i.e. 09:00 IST) | Vercel sends `Authorization: Bearer $CRON_SECRET` automatically; the API replies `{"skipped":"not_due"}` on the six days that are not due. |
| Hostinger VPS / Node host | systemd timer or crontab calling the API | `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.example.com/api/cron/weekly-report` |
| Any platform scheduler | HTTP task with the same header | `GET` and `POST` are both supported. |

Required manual steps before production delivery: verify the sending domain with the email provider, set `EMAIL_API_KEY`/`EMAIL_FROM`, set `CRON_SECRET`, then enable the schedule in **Admin → Settings → Weekly Business Activity Report**.
