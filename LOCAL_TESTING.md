# Local testing guide

## Prerequisites

- Node.js 22.13 or later (`node --version`)
- npm 10 or later
- MongoDB Atlas test database or local MongoDB
- Credentials for any service you intend to test: Cloudinary, Stability AI, APInex, and Resend

## Configure environments

1. Copy `.env.example` to `.env.local`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Use a non-production MongoDB database for local testing.
4. Set `BACKEND_API_URL=http://localhost:4000`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, and set `FRONTEND_ORIGINS=http://localhost:3000` in the backend environment.
5. Set strong local-only `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `CRON_SECRET` values. Leave third-party values empty only for features you are not testing.

## Install and run

Open two terminals from the repository root:

```powershell
npm ci
cd backend
npm ci
npm start
```

```powershell
npm ci
npm run dev
```

The API should report `Solarious API listening on 4000`; then open `http://localhost:3000`.

## Automated checks

```powershell
npm run lint
npm run typecheck
npm run build
node --test tests/*.test.mjs
npm --prefix backend test
npm --prefix backend run build
```

With the API, test database, and admin credentials configured:

```powershell
npm --prefix backend run test:smoke
```

## Manual feature checklist

- Visit public pages, product pages, event pages, and a deliberately unknown URL.
- Check navigation and deep-link refreshes on desktop and mobile widths.
- Submit contact, quote, and solar-recommendation forms using test details; verify validation, loading, success, and error states.
- Sign in at `/signin-with-chatgpt`, open `/admin`, then sign out. Confirm an unauthenticated `/admin` visit redirects to sign-in.
- In admin, test a non-destructive create/update/delete workflow against the test database for products, events, gallery, resources, locations, and site settings.
- Upload a permitted test image and a PDF datasheet. Confirm Cloudinary storage and public/admin access behavior. Do not use local uploads for production validation.
- Generate a Creative only when Stability and Cloudinary test credentials are configured. Confirm provider failures show an error; with `FESTIVAL_TEMPLATE_FALLBACK=true`, only retryable provider failures may use the deterministic fallback.
- If APInex and Resend are configured, use their safe health/test actions and verify no secrets appear in browser or server output.
- Request `http://localhost:4000/api/health`; it must return `ok: true` and `database: connected` before treating local testing as successful.

## Common failures

- **503 from `/api/*`:** confirm frontend `BACKEND_API_URL`, API startup, and `FRONTEND_ORIGINS`.
- **Health is degraded:** confirm `MONGODB_URI`, Atlas network access, database user permissions, and TLS connectivity.
- **Admin loop or missing session:** use `http://localhost` consistently; do not mix `localhost` and `127.0.0.1`.
- **Uploads fail:** configure `CLOUDINARY_URL`; production intentionally disables local upload storage.
- **Creative/report features fail:** add the corresponding provider credentials, or leave the optional feature untested and record that limitation.
