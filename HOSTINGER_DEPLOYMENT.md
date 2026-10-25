# Hostinger deployment plan

## Required architecture

Deploy two separate Node.js web apps from the same repository:

| App | Domain | Repository root | Build | Start |
| --- | --- | --- | --- | --- |
| Next.js frontend | `www.solariousenergy.com` | repository root | `npm ci && npm run build` | `npm start` |
| Express API | `api.solariousenergy.com` | `backend` | `npm ci && npm run build` | `npm start` |

Use Node.js **22.x** for both apps. Hostinger documents Node.js 22 support for eligible Node.js web apps. Do not set a fixed port: both apps already honor Hostinger's `PORT` value.

This requires an hPanel plan that includes at least two Node.js websites. Confirm this in hPanel before deployment. If the plan cannot create both apps, the project is not deployable there as-is; upgrade to an eligible plan or use a VPS. Do not convert this Next.js application to static export: it relies on server route handlers for its API proxy, admin sign-in, sign-out, and scheduled report forwarding.

## Frontend production variables

Configure in the frontend Node.js app:

```dotenv
BACKEND_API_URL=https://api.solariousenergy.com
NEXT_PUBLIC_SITE_URL=https://www.solariousenergy.com
FRONTEND_ORIGINS=https://www.solariousenergy.com,https://solariousenergy.com
CRON_SECRET=the-same-long-random-value-as-the-api
```

`VITE_API_URL` is a compatibility fallback and is not required when `BACKEND_API_URL` is set. Do not set database, Cloudinary, admin, email, or AI secrets here.

## API production variables

Configure in the API Node.js app:

```dotenv
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
DB_NAME=solarious
FRONTEND_ORIGINS=https://www.solariousenergy.com,https://solariousenergy.com
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
CLOUDINARY_URL=cloudinary://...
LOCAL_UPLOADS_ENABLED=false
CRON_SECRET=the-same-long-random-value-as-the-frontend
```

Add `IMAGE_*`, `APINEX_*`, and `EMAIL_*` only for the corresponding enabled services. See [ENVIRONMENT.md](ENVIRONMENT.md) for the complete inventory. Add the actual frontend origin only after its Hostinger domain is known; do not leave localhost origins in the production allow-list.

## hPanel setup checklist

1. In hPanel, verify the purchased plan exposes **Websites → Add Website → Node.js Web App**, supports Node.js 22.x, and allows two Node.js websites.
2. Connect the approved GitHub repository. Configure the frontend app first, then the API app with `backend` as its root directory.
3. Add the environment variables above in hPanel, never in Git.
4. Attach HTTPS domains: `www` to the frontend and `api` to the backend. Redirect the apex domain to `www` or include it in frontend routing and the API CORS allow-list.
5. In MongoDB Atlas, allow the Hostinger application's outbound network access by the method available for your Atlas plan. Use a least-privilege database user.
6. Deploy the API, then visit `https://api.solariousenergy.com/api/health`. It should show a connected database before deploying the frontend.
7. Deploy the frontend, then test the public site, `/admin` sign-in, API-backed forms, uploads, and a nested-route refresh.
8. Configure the weekly-report schedule in Hostinger Cron Jobs after confirming the exact deployed path and secret. Hostinger's cron environment and command paths must be copied from hPanel; do not reuse the Vercel cron configuration.

## Platform constraints

- Managed Hostinger Node.js web apps permit a long-running web server but do not support custom ports, inbound WebSockets, or persistent background workers. This project does not require those features.
- Hostinger stops web requests after 120 seconds. Creative requests are currently allowed up to 115 seconds by the frontend proxy, leaving little margin; monitor this feature and move long generation work to a scheduled/job design only with explicit approval.
- Cloudinary is required for durable production uploads; Hostinger local disk uploads are deliberately disabled in production.
- `render.yaml` and `vercel.json` are legacy deployment configurations and are not used by Hostinger. Keep them only if retaining those deployment targets.
