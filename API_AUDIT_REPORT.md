# Solarious API audit report

**Scope:** the Express API in `backend/` (96 routes) and the Next.js proxy that fronts it (`app/api/[...path]/route.ts`).
**Commit audited:** `dfb01cb` (`main`).
**Date:** 2026-10-31.
**Method:** static review of every route, model, and service module, plus live probes against `backend/server.mjs` started locally on port 4055 (no MongoDB available, so database-backed handlers were exercised only down to the `requiresDatabase` gate). Automated suites were executed: 28 backend service tests and 35 frontend static tests, all passing.

Everything below cites `file:line` at the audited commit. "Verified" means observed in a live probe; "By inspection" means confirmed by reading the code path.

---

## 1. Executive summary

The API is in better shape than most first-pass audits of this size: the storage layer validates real file signatures, the local-upload path has containment checks, CSV/HTML injection in the weekly report is neutralised, the AI and image providers redact credentials and classify failures, and CORS/helmet defaults behave correctly in live probes.

Four things need attention before this is production-hard:

1. **`POST /api/admin/login` has no throttling at all.** Verified: 12 consecutive wrong-password attempts all returned `401` with no delay, no lockout, no backoff.
2. **Client-IP rate limits do not work behind the Next proxy.** There is no `trust proxy` setting and the limiter keys on `req.ip`, which is the proxy hop. Live site-wide budgets of 8 enquiries / 15 min, 12 AI messages / 10 min, and 6 recommendation requests / hour are shared by all visitors behind that hop.
3. **Admin sessions cannot be revoked.** Logout clears the browser cookie only; the signed token stays valid for 8 hours.
4. **There is no audit trail for ~70 admin mutations.** `ProtectedAudit` is written on exactly two routes (log cleanup and site-settings update); product, gallery, team, event, creative, and lead changes leave no record.

Three lower-severity items are also cheap to fix in the same pass: an unescaped `RegExp` built from the admin search query, a JSON error handler registered *before* the five solar-recommendation and solar-lead routes (so their failures return Express's HTML error page, stack trace included outside production), and 121 lines of commented-out dead code in `backend/services/ai.mjs`.

Environment templates shipped alongside this report were missing two variables that the code actually reads (`BUSINESS_TIMEZONE`, `FESTIVAL_TEMPLATE_FALLBACK`) plus the migration and smoke-test groups documented in `ENVIRONMENT.md`. Both `.env.example` files are updated here.

---

## 2. What is already correct (keep these)

| Control | Evidence | Status |
| --- | --- | --- |
| CORS allow-list with credentials, rejects unknown origins | `backend/server.mjs:55`; verified `OPTIONS` from `http://localhost:3000` → `204`, from `http://evil.example` → `403`, and a plain `GET` with a bad `Origin` → `403 {"error":"Origin not allowed"}` | Verified |
| Helmet baseline headers (HSTS, `nosniff`, `frame-ancestors 'self'`, COOP/CORP) | `backend/server.mjs:55` | Verified |
| 1 MB JSON body cap, structured 413 | `backend/server.mjs:55`; verified 1.1 MB login body → `413` | Verified |
| Admin routes gated by signed, `HttpOnly` cookie | `backend/server.mjs:59-64`, `64`; verified login sets `HttpOnly; Max-Age=28800`, no session → `401` | Verified |
| Timing-safe credential and signature comparison | `safeEqual` at `backend/server.mjs:58`, used at `62`, `92`, `271` | By inspection |
| Fails closed when the database is down | `requiresDatabase` at `backend/server.mjs:67`; verified every DB route → `503` rather than accepting writes | Verified |
| Uploads validated by decoded content, not by MIME or extension | `backend/services/image-validation.mjs:10-38` (`sharp` metadata + allow-list) | By inspection |
| Datasheet uploads: signed direct-to-Cloudinary, then server re-fetches the asset and probes `%PDF-` magic bytes, deleting failures | `backend/server.mjs:133`, `PRODUCT_DATASHEET_FOLDER` prefix check, `Range: bytes=0-4` probe | By inspection |
| Local file serving has path containment | `safeFileName` (`backend/server.mjs:78`) and `localFilePath` resolve-and-prefix check (`backend/services/resource-delivery.mjs:23-36`) | By inspection |
| Weekly report escapes HTML and neutralises spreadsheet formulas | `escaped`/`spreadsheetSafe`/`csvCell` at `backend/services/enquiry-report.mjs:1-3` | By inspection |
| Image provider: 3 attempts, retry-after aware, credential redaction, deterministic fallback only when explicitly enabled and retryable | `backend/services/image-generation.mjs:14`, `34-46`, `79-83` | By inspection |
| Creative generation idempotency and stage polling | `Idempotency-Key` handling at `backend/server.mjs:246`, `/api/admin/creative-generations/:key` at `245` | By inspection |
| Enquiry idempotency + duplicate window + rate limit | `backend/server.mjs:95-96` | By inspection |
| No secret ever reaches the browser bundle | Only `NEXT_PUBLIC_SITE_URL` is `NEXT_PUBLIC_*`; `BACKEND_API_URL`, `CRON_SECRET`, `VITE_API_URL` are server-only (`lib/server-config.ts`) | By inspection |
| Proxy strips `origin`/`authorization`/`host` before the server-to-server hop and enforces trusted origins for admin mutations | `app/api/[...path]/route.ts:19-27`, `36-42` | By inspection |

---

## 3. Findings

### High

#### H1 — Admin login has no rate limiting, lockout, or backoff
**Evidence:** `backend/server.mjs:92`. The handler compares credentials and returns `401`; it is not wrapped in any limiter (the three existing limiters cover enquiries, AI/leads, and recommendations only).
**Verified:** twelve consecutive `POST /api/admin/login` requests with a wrong password returned `401` each, with no `429`, no `Retry-After`, and no measurable delay.
**Additional exposure:** the admin password is also the HMAC signing key for sessions (`backend/server.mjs:59`) and for report tokens (`270`), so a successful offline or online brute force yields both login access and the ability to mint valid cookies indefinitely.
**Impact:** internet-facing credential stuffing against a single account with an 8-hour session lifetime and no observable attempt trail (`ProtectedAudit` is not written on login failures either).
**Recommendation:**
- Add a limiter keyed on `username + client IP` with progressive delay (e.g. 5 attempts / 15 min, then exponential backoff) and a `429` body that matches the existing error vocabulary.
- Record failures in `ProtectedAudit` with a truncated username, and alert on bursts.
- Derive session signatures from a dedicated `SESSION_SECRET` (`server.mjs:59`) so password rotation and session invalidation are independent decisions.

#### H2 — Per-IP rate limits collapse into one shared bucket behind the proxy
**Evidence:** limiters key on `req.ip` / `req.socket.remoteAddress` at `backend/server.mjs:56` (AI: 12 / 10 min), `95` (enquiries: 8 / 15 min), `269` (recommendations: 6 / hour). `app.set("trust proxy", …)` appears nowhere in the file, and the Next proxy strips `host`/`origin`/`authorization` but forwards the rest of the headers (`app/api/[...path]/route.ts:36-42`), so any `X-Forwarded-For` is ignored by Express while every browser request arrives from the same proxy hop.
**Impact:** limits are effectively "per proxy egress IP", not per visitor. On a single-instance deployment this means **eight enquiries per 15 minutes for the entire website**; one abusive client can lock out every other visitor, while on multi-egress serverless deployments the counters are simultaneously unenforceable (each new egress IP starts with a fresh budget). Both failure modes are worse than having no limit, because the API appears protected.
**Recommendation:**
- Set `app.set("trust proxy", 1)` (one hop: Render/Vercel) and validate the hop count against the actual topology.
- Have the proxy inject a trusted client identifier (it already holds the real `x-forwarded-for`) and key limiters on that, keeping a second global limiter as a backstop.
- Move the three `Map`-based limiters to a shared store (Redis or Mongo TTL collection) so multiple instances share one budget — see M4.

### Medium

#### M1 — Admin sessions cannot be revoked
**Evidence:** logout only clears the cookie (`backend/server.mjs:94`); `verifySession` (`62`) accepts any signature-valid, unexpired payload, and there is no session store, denylist, or `nonce` check.
**Verified:** `backend/scripts/smoke-test.mjs` asserts "session rejected after logout", but only because the client stopped sending the cookie — replaying the captured cookie still works for the full 8-hour window (`ADMIN_SESSION_SECONDS` at `57`).
**Impact:** a stolen cookie or a shared workstation cannot be invalidated short of rotating `ADMIN_PASSWORD`, which signs out every admin.
**Recommendation:** store sessions (or at least a per-user `sessionEpoch`/nonce denylist) in Mongo keyed by token hash; have logout delete the record. Rotate `expires` on activity if you want sliding sessions.

#### M2 — Admin audit trail covers 2 of ~70 mutations
**Evidence:** `ProtectedAudit.create` occurs only at `backend/server.mjs:258` (log cleanup) and `261` (site settings). Product CRUD (`129-134`), resources (`141`), hero banners, gallery, team (`125-126`), events (`204`), creatives (`246-253`), enquiry reports (`110-116`), and solar leads (`277-278`) write nothing.
**Impact:** for a CMS that controls the public site, deleted products or altered team photos are unrecoverable and unattributable; there is no basis for incident review.
**Recommendation:** an `adminAudit(action, req, details)` helper called from the `admin` middleware's downstream handlers (or a small wrapper around each mutating route) recording actor, route, target id, and a redacted diff. Reuse the existing `AppLog`/`ProtectedAudit` models rather than adding a third.

#### M3 — ReDoS / cost amplification in the solar-lead search
**Evidence:** `backend/server.mjs:277` builds `new RegExp(search, "i")` straight from `req.query.search`, with no escaping and no length bound, and applies it across four fields with `$or`.
**Impact:** a crafted pattern (e.g. nested quantifiers) can pin a request thread; even benign input forces an unindexed four-field scan. Authenticated-only, so this is an availability, not a disclosure, issue.
**Recommendation:** cap `search` at ~80 characters, escape regex metacharacters (`search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`), or switch to a text index and `$text` search.

#### M4 — Rate-limit and duplicate-detection state is per-process
**Evidence:** `assistantRequests`, `inquiryRequests`, `recommendationRate`, `datasheetSignatureRequests` are module-level `Map`s (`backend/server.mjs:56`, `95`, `269`, `90`).
**Impact:** limits reset on every deploy/restart and multiply by instance count; memory grows with the number of distinct keys until filtered by timestamp on next access (no maximum size).
**Recommendation:** shared TTL store, plus a cap per map keyed by IP with periodic sweep if a shared store is out of scope.

#### M5 — Login error surface leaks backend internals
**Evidence:** `app/signin-with-chatgpt/route.ts` renders `Admin service returned HTTP ${status}: ${detail}` and, on network failure, `Admin service network error: ${detail}` to an unauthenticated browser.
**Impact:** internal hostnames, TLS errors, and upstream status codes are disclosed on a public page; useful reconnaissance.
**Recommendation:** map upstream failures to a fixed message ("Admin sign-in is temporarily unavailable"), keep the detail in server logs only.

#### M6 — The JSON error handler is registered before five routes, so their failures bypass it
**Evidence:** `app.use((error, req, res, _next) => …)` sits at `backend/server.mjs:268`, but the solar-recommendation routes (`274`, `275`, `276`) and the solar-lead admin routes (`277`, `278`) are registered *after* it. Express runs error middleware in registration order, so errors thrown by those five handlers fall through to Express's final handler.
**Impact:** a database failure, a catalog miss (`makeRecommendation` throws `serviceError(..., "catalog", 503)` at `273`), or a Mongoose validation error on `PATCH /api/admin/solar-leads/:id` returns Express's default HTML error page instead of `{error, code}` — and includes a stack trace whenever `NODE_ENV !== "production"`. It also means any future `app.get` appended below the handler is silently exposed.
**Recommendation:** move the error handler and (once added) the JSON 404 handler to the end of the file, immediately before `app.listen` at `279`, and add a test asserting `content-type: application/json` on an induced failure for every route group.

### Low

#### L1 — Admin mutation authorization is single-layer inside the proxy
`app/api/[...path]/route.ts:22` checks the `Origin` header for `/api/admin/*` mutations, and the backend cookie is `SameSite=None; Secure` in production (`backend/server.mjs:63`), so the cookie does travel cross-site. Probes confirm the proxy returns `403` for untrusted origins and that the backend's own CORS layer rejects disallowed origins before handlers run, so **there is no exploitable CSRF today** — but the guarantee depends on two independent configurations staying correct, and the backend itself never inspects `Origin` for admin mutations. Add an `Origin`/`Sec-Fetch-Site` assertion in the backend `admin` middleware (`66`) as defence in depth.

#### L2 — Unknown `/api/*` paths fall through to Express's HTML 404
There is no catch-all 404 handler, and the only 404s in the file are per-route. With the database connected, an unknown API path returns Express's default HTML page instead of the JSON error contract; with the database down it returns the `503` guard message, which masks the mistake during testing. Add a terminal `app.use("/api", (req,res)=>res.status(404).json({error:"Not found", code:"NOT_FOUND"}))` after all route registrations, and extend the error handler to translate `entity.too.large`/`SyntaxError` bodies into the same vocabulary (verified today: a 1.1 MB body produces the raw `{"error":"request entity too large"}`).

#### L3 — Cron authentication is duplicated and non-constant-time
`backend/server.mjs:116` and `254` compare `authorization` with `!==` against `CRON_SECRET`, and both `/api/cron/daily-creative` (`256`) and `/api/internal/daily-creative` (`255`) are exposed with the same check while only the former is documented. Use `safeEqual` for both, and either remove the internal alias or document it.

#### L4 — Public health endpoint discloses configuration state
`backend/server.mjs:91` publishes the database name and whether storage, AI, email, and image providers are configured. The healthy payload includes `dbName`, `storage`, `ai`, and `imageProvider.{configured,model}` (the degraded payload drops `dbName` only). Split this into a minimal public probe (`{ok, status}`) and an authenticated detail endpoint.

#### L5 — Recommendation report token: 30-day PII link, no rate limit
`backend/server.mjs:270-272`, served at `275`. The token is signed and expiring, but the `/report` endpoint serves a PDF containing name, mobile, and cost estimates, increments a counter on every call, and has no limiter. Add a per-token and per-IP limit, and consider a shorter default TTL.

#### L6 — Login redirect origin trusts `X-Forwarded-Host`
`publicOrigin()` in `app/signin-with-chatgpt/route.ts` composes the redirect target from `x-forwarded-host`/`host`. `safeReturnTo` correctly blocks absolute and protocol-relative paths, so the practical impact is limited to a misconfigured or header-spoofing proxy, but deriving the origin from configuration (`NEXT_PUBLIC_SITE_URL`) removes the class entirely.

### Hygiene

- **Dead code:** `backend/services/ai.mjs:1-121` is a commented-out copy of the live implementation at `122-231`. Delete it; it doubles the review surface of the AI module.
- **Route surface:** the Next proxy forwards `/api/*` unfiltered, including `/api/cron/*` and `/api/internal/*` (`app/api/[...path]/route.ts:17`). Those routes authenticate on their own, so this is not a bypass, but an allow-list of proxied prefixes would make the browser-facing surface explicit.

---

## 4. Endpoint inventory

**96 routes** (`backend/server.mjs`): 72 admin, 18 public, 3 operational, 3 infrastructure.

### Public and operational

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/health` | none | DB ping + configuration disclosure (L4) |
| GET | `/api/health/ai` | admin | Live provider round-trip |
| GET | `/api/files/:name` | none | Local uploads only, dev-only, path-contained |
| POST | `/api/inquiries` | none | 8 / 15 min shared bucket (H2), idempotency key |
| POST | `/api/ai/chat` | none | 12 / 10 min shared bucket (H2), safe fallback on provider failure |
| POST | `/api/ai/solar-estimate` | none | Same limiter, deterministic computation |
| POST | `/api/ai/lead` | none | Same limiter, consent required, 10-min phone dedupe |
| POST | `/api/solar-recommendations` | none | 6 / hour shared bucket (H2), idempotency key |
| GET | `/api/solar-recommendations/:token/report` | signed token | PDF with PII, unbounded (L5) |
| POST | `/api/solar-recommendations/:token/quotation-request` | signed token | — |
| GET | `/api/site-settings/:key` | none | Allow-listed keys only |
| GET | `/api/products`, `/api/products/:slug` | none | Published only |
| GET | `/api/team`, `/api/resources`, `/api/resources/:id/file` | none | — |
| GET | `/api/hero-banners`, `/api/events`, `/api/events/:slug`, `/api/gallery`, `/api/locations` | none | — |
| GET | `/api/cron/enquiry-report` | bearer `CRON_SECRET` | Also rebuilt in `app/api/cron/enquiry-report/route.ts` |
| GET | `/api/cron/daily-creative` | bearer `CRON_SECRET` | Duplicate alias at `/api/internal/daily-creative` (L3) |
| POST | `/api/internal/daily-creative` | bearer `CRON_SECRET` | Undocumented (L3) |

### Admin (all cookie-authenticated)

- **Session:** `POST /api/admin/login`, `GET /api/admin/session`, `POST /api/admin/logout`.
- **Inquiries (4):** list, patch status, delete, plus `enquiry-report-settings` read/write, `enquiry-reports` list/test/send-now/retry.
- **Catalogue (8):** products list/create/update/delete, `upload-image`, `datasheet-signature`, `verify-datasheet`, `upload-datasheet` (deliberately `410`).
- **Content (18):** resources list/create/patch/delete/upload/`:id/file`; hero banners (3); gallery (6 incl. upload-signature and reorder); events (6 incl. upload-signature); locations (4).
- **Team (4):** list, create, update with photo, status patch, delete.
- **Creative studio (11):** settings read/write, creatives list/create/festival/patch/delete, `generate-image`, `regenerate`, `:id/file`, `:id/download`, generation polling, branding upload.
- **Site settings (3):** `GET/PUT /api/admin/settings/:key`, `POST /api/admin/site-content/upload`.
- **Leads (2):** `GET /api/admin/solar-leads`, `PATCH /api/admin/solar-leads/:id`.
- **Logs (2):** `GET /api/admin/logs` (+ `?download=1`), `DELETE /api/admin/logs`.

---

## 5. Environment template gap analysis

Code reads 30 environment variables. Before this change the templates covered the required set but omitted two variables that are read by running code and five script-only variables documented in `ENVIRONMENT.md`.

| Variable | Read at | Was in template | Action |
| --- | --- | --- | --- |
| `BUSINESS_TIMEZONE` | `backend/server.mjs:223` | No | Added (commented, default `Asia/Kolkata`) |
| `FESTIVAL_TEMPLATE_FALLBACK` | `backend/services/image-generation.mjs:81` | No | Added (commented, off by default) |
| `LOCAL_MONGODB_URI`, `ATLAS_MONGODB_URI`, `ATLAS_EXPECTED_HOST`, `MIGRATION_BACKUP_DIR` | `backend/scripts/migrate-local-mongodb-to-atlas.mjs` | No | Added as a migration-only group |
| `PUBLIC_SITE_URL` | `backend/scripts/migrate-production-cms.mjs` | No | Added as a migration-only group |
| `API_BASE_URL`, `SMOKE_TEST_ORIGIN` | `backend/scripts/smoke-test.mjs` | No | Added as a smoke-test-only group |
| `NODE_ENV` | `backend/server.mjs` (`localUploadsEnabled`, cookie flags) | Yes | Documented in `ENVIRONMENT.md` table alongside the new comments |
| All other frontend/backend variables | see `ENVIRONMENT.md` | Yes | Unchanged |

Guards that remain correct and are worth preserving: `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `FRONTEND_ORIGINS` throw at boot when missing (`backend/server.mjs:23-27`), so a misconfigured deploy fails loudly instead of serving unauthenticated. No template contains a real credential.

---

## 6. Test coverage

| Suite | Command | Result | Gap |
| --- | --- | --- | --- |
| Backend services | `npm --prefix backend test` | 28/28 pass | No HTTP-layer tests |
| Frontend static contracts | `node --test tests/*.test.mjs` | 35/35 pass | Asserts source patterns, not behaviour |
| Session smoke test | `npm --prefix backend run test:smoke` | Requires live API + Mongo | Does not cover rate limits, cron auth, login throttling, or the 404 contract |

Routes are effectively untested at the HTTP boundary: validators, status codes, idempotency, and the limiters currently have no regression protection. The highest-value addition is a route test harness against an ephemeral Mongo (or the model layer stubbed) covering: login throttling, enquiry idempotency/duplicate window, admin 401 on every mutating route, `Origin` rejection, upload validation rejects, and cron secrets.

---

## 7. Suggested order of work

| Priority | Item | Effort |
| --- | --- | --- |
| P0 | H1 login throttling + `SESSION_SECRET` split | ~0.5 day |
| P0 | H2 `trust proxy` + proxy-injected client key | ~0.5 day |
| P1 | M1 revocable sessions | ~1 day |
| P1 | M2 audit trail for admin mutations | ~1 day |
| P1 | M3 escape/bound the lead search regex | ~2 hours |
| P2 | M4 shared limiter store | ~1 day |
| P2 | M5 login error messages | ~1 hour |
| P2 | M6 move error/404 handlers to the end of the middleware chain | ~1 hour |
| P2 | L1 backend `Origin` assertion, L2 JSON 404/413 contract | ~3 hours |
| P3 | L3–L6, dead code, proxy allow-list | ~1 day |
| P3 | Route-level test harness (section 6) | ~2 days |

---

## Appendix A — live probe evidence

Server: `backend/server.mjs` on port 4055, `NODE_ENV=development`, `FRONTEND_ORIGINS=http://localhost:3000`, no MongoDB reachable.

```
GET  /api/health                      503  {"ok":false,"status":"degraded","database":"connecting",provider flags only}
POST /api/admin/login (wrong) x12     401 401 401 401 401 401 401 401 401 401 401 401   ← no throttle (H1)
POST /api/admin/login (correct)       200  Set-Cookie: …; HttpOnly; Max-Age=28800; SameSite=Lax
GET  /api/health  Origin: evil.example 403  {"error":"Origin not allowed"}
OPTIONS /api/admin/inquiries  Origin: localhost:3000        204
OPTIONS /api/admin/inquiries  Origin: evil.example          403
GET  /api/admin/inquiries (no cookie)  503  (database guard runs before auth — see L2)
POST /api/admin/login  (1.1 MB body)   413  {"error":"request entity too large"}
ANY  /api/does-not-exist               503  (guard message, not a JSON 404 — see L2)
POST /api/ai/chat (no provider key)    503  {"error":"Database is temporarily unavailable…"}
```

## Appendix B — not verified in this environment

- Anything past the `requiresDatabase` gate: no `mongod` binary or reachable cluster was available, so admin handlers, duplicate windows, creative generation, and the enquiry/report flows were reviewed statically only.
- Provider integrations (Stability, Apinex, Resend, Cloudinary) were exercised through their unit tests and error-classification branches, not against live accounts.
- Production cookie flags (`SameSite=None; Secure`) and edge-proxy behaviour could not be observed locally; both are asserted from source (`backend/server.mjs:63`).
- Frontend `next build`/`tsc` were not run; only the dependency-free static tests were executed.
