# Solarious Energy

Solarious Energy is a Next.js frontend and an Express API application.

- Frontend: Next.js Node.js application
- API: Express Node.js application (`backend/`)
- Database: MongoDB Atlas
- Media and document uploads: Cloudinary
- Marketing text AI: APInex, server-side only

For local setup, see [LOCAL_TESTING.md](LOCAL_TESTING.md). For the verified Hostinger architecture and required hPanel configuration, see [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md). The existing `DEPLOYMENT.md`, `render.yaml`, and `vercel.json` describe legacy Render/Vercel deployments.

## Procurement platform

- **RFQ portal** — `/quote` collects a structured B2B procurement request in eight steps. The API issues a server-generated reference (`SOL-RFQ-2026-000001`), classifies priority from the capacity tier, and escalates every request of 1 MW and above.
- **Notifications** — SMTP (Nodemailer) customer confirmation with a matching datasheet, internal desk notice, high-priority alert, and optional Slack/Teams webhook. Failures are recorded per channel and retried for up to five attempts; the RFQ is always saved first.
- **Admin** — `/admin` → *RFQ & Leads* for the pipeline, assignment, notes, activity history and CSV export; *Certifications* for the compliance registry.
- **Certifications** — `/certifications` publishes a record as verified only when a certificate document is linked; otherwise it is labelled "Documentation pending".

Operations guide: [docs/RFQ-PLATFORM.md](docs/RFQ-PLATFORM.md). Delivery notes and known gaps: [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md). API security review: [API_AUDIT_REPORT.md](API_AUDIT_REPORT.md).

## Tests

```bash
npm --prefix backend test     # domain, workflow and HTTP route tests
node --test tests/*.test.mjs  # frontend contract tests
```

Never commit environment files or service credentials.
