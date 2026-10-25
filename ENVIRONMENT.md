# Environment configuration

Copy `.env.example` to `.env.local` for the Next.js app and `backend/.env.example` to `backend/.env` for the API. Never place backend credentials in a `NEXT_PUBLIC_*` variable or commit either real environment file.

| Variable | Application | Required | Purpose | Used in |
| --- | --- | --- | --- | --- |
| `BACKEND_API_URL` | Frontend server | Yes | HTTPS origin for server-side API forwarding and admin sign-in. No `/api` suffix. | `lib/server-config.ts`, API routes |
| `VITE_API_URL` | Frontend server | Optional | Backward-compatible fallback for `BACKEND_API_URL`. | `lib/server-config.ts` |
| `NEXT_PUBLIC_SITE_URL` | Frontend/public | Yes in production | Canonical public site URL for metadata, sitemap, and robots. | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts` |
| `FRONTEND_ORIGINS` | Frontend server | Required for admin proxy writes in production | Comma-separated canonical browser origins trusted by the Next API proxy. Do not derive this from Host headers. | `app/api/[...path]/route.ts`, `lib/server-config.ts` |
| `CRON_SECRET` | Frontend server and backend | Yes when reports are scheduled | Shared bearer secret for the Vercel cron forwarding route and backend report endpoint. | `app/api/cron/enquiry-report/route.ts`, `backend/server.mjs` |
| `MONGODB_URI` | Backend | Yes | MongoDB/Atlas connection URI. | `backend/db.mjs`, server startup and migration |
| `DB_NAME` | Backend | Optional | Database name; defaults to `solarious`. | `backend/db.mjs`, migrations |
| `PORT` | Backend | Optional | HTTP listening port; defaults to `4000`. | `backend/server.mjs` |
| `FRONTEND_ORIGINS` | Backend | Yes | Comma-separated CORS allow-list of frontend origins. | `backend/server.mjs` |
| `BUSINESS_TIMEZONE` | Backend | Optional | Daily Creative business timezone; defaults to `Asia/Kolkata`. | `backend/server.mjs` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Backend | Yes | Admin session authentication credentials. | `backend/server.mjs` |
| `CLOUDINARY_URL` | Backend | Yes in production | Cloudinary storage credentials in URL form. | `backend/services/cloudinary.mjs` |
| `LOCAL_UPLOADS_ENABLED` | Backend | Optional | Enables local uploads outside production only. | `backend/server.mjs` |
| `IMAGE_PROVIDER`, `IMAGE_MODEL`, `IMAGE_API_KEY` | Backend | Required for Creative Studio | Stability AI image provider configuration. | `backend/services/image-generation.mjs` |
| `FESTIVAL_TEMPLATE_FALLBACK` | Backend | Optional | Enables a deterministic image only after a retryable image-provider outage; never for auth/billing failures. | `backend/services/image-generation.mjs` |
| `APINEX_API_KEY`, `APINEX_BASE_URL`, `APINEX_MODEL` | Backend | Optional | Marketing copy AI configuration. | `backend/services/ai.mjs` |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | Backend | Optional | Resend-backed enquiry reports; required only when reports are enabled. | `backend/services/enquiry-report.mjs` |
| `LOCAL_MONGODB_URI`, `ATLAS_MONGODB_URI`, `ATLAS_EXPECTED_HOST`, `MIGRATION_BACKUP_DIR` | Backend migration | Migration only | Local-to-Atlas migration inputs and backup location. | `backend/scripts/migrate-local-mongodb-to-atlas.mjs` |
| `PUBLIC_SITE_URL` | Backend migration | Migration only | Public site URL used by the production CMS migration. | `backend/scripts/migrate-production-cms.mjs` |
| `API_BASE_URL`, `SMOKE_TEST_ORIGIN` | Backend test | Test only | API target and allowed Origin for the smoke-test script. | `backend/scripts/smoke-test.mjs` |
