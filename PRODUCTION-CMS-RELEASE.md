# Production CMS release

## Safe rollout

1. Create a MongoDB Atlas snapshot or export the `products`, `resources`, `settings`, `businesslocations`, and `creatives` collections.
2. Configure `MONGODB_URI`, `DB_NAME`, `CLOUDINARY_URL`, `FRONTEND_ORIGINS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `PUBLIC_SITE_URL` on the backend. Keep secrets server-only.
3. Run `npm --prefix backend run migrate:cms:plan` and review the dry-run summary.
4. Run `npm --prefix backend run migrate:cms` once approved. The migration uses upserts and does not delete records.
5. Deploy the backend to staging, set the frontend `BACKEND_API_URL` to that staging origin, then deploy the frontend preview.
6. Complete authenticated upload, CMS, preview, mobile, and refresh checks in staging before promoting either deployment.

## Enquiry reports

- Configure `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and a verified `EMAIL_FROM` address on the backend. The provider key must never be added to the frontend or committed to Git.
- Set one strong `CRON_SECRET` value in both Vercel and the backend service. Vercel calls the protected frontend cron route, which forwards the authenticated request to the backend.
- The Vercel cron runs a daily due-date check at `03:30 UTC` (approximately 09:00 IST). The backend stores the exact seven-day schedule, uses non-overlapping `[start, end)` report periods, and creates a unique period record before delivery to prevent duplicate scheduled sends.
- In Admin → Settings → Enquiry Email Reports, enter the recipient, save and enable the schedule, send a test email, and review delivery history before production promotion.
- Report email failures retain a safe error summary and may be retried from the admin screen. An `unknown` provider result is not retried automatically because the provider may already have accepted it.

## Admin workflow

- **Products:** create or duplicate a draft, set technology independently from module type, upload an image, upload a PDF directly to Cloudinary, review the preview, then publish.
- **Site CMS:** edit About and Manufacturing copy, roadmap entries, locations, and branding. Client-supplied coordinates remain `pending` until confirmed.
- **Resources:** use the Certificates category for verified certificates. These appear on About; other documents remain in Resources.
- **Marketing / AI:** configure verified branding, select an occasion, language and output ratio, adjust typography, then generate. Provider failures are returned to the admin; an optional deterministic template can be enabled only for retryable outages.

Product PDF uploads use a short-lived signed browser-to-Cloudinary request and server verification, so the 20 MiB file does not traverse the Vercel frontend function.

## Festival image provider

- Configure `IMAGE_PROVIDER=stability`, `IMAGE_MODEL=core` (or `ultra`) and a server-only `IMAGE_API_KEY` on the backend.
- Stable Image Core is the low-cost default. Stability currently lists Core at 3 credits per successful image and Ultra at 8 credits; confirm current pricing before changing models.
- A provider `402` means the configured Platform API account cannot fund the request. Restore Platform API credits or replace the server-side key with one from the funded account.
- `FESTIVAL_TEMPLATE_FALLBACK=true` permits a deterministic template only for retryable provider outages. Authentication, permission and payment failures never fall back or create a misleading successful record.
