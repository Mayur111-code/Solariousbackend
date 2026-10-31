# Solarious Energy — UI/UX & Responsive Audit Report

**Scope:** every public page and every admin module on a real build.
**Method:** headless Chromium sweep of 22 public routes + 13 admin tabs × 12 viewport widths (320, 360, 375, 390, 430, 576, 768, 1024, 1280, 1366, 1440, 1920) = **420 measurements per run**, before and after, plus 42 scripted interaction checks and before/after screenshots.
**Result:** 26 page/width combinations had real layout defects → **0 after**. 19 pages were affected → **0 after**.
**Status:** merged to `main`. PR #10 → merge commit `521d6bc`; PR #11 → merge commit `0746e8e`.

---

## 1. Coverage

### Public pages audited — 22 routes
`/` · `/about` · `/certifications` · `/compare` · `/contact` · `/events` · `/events/[slug]` · `/gallery` · `/manufacturing` · `/module-recommender` · `/privacy-policy` · `/products` · `/products/[slug]` · `/projects` · `/quality` · `/quote` · `/resources` · `/services` · `/solar-calculator` · `/solar-recommendation` · `/sustainability` · `/terms`
(`/technology` is a 308 redirect to `/products` and was verified as such; `/robots.txt`, `/sitemap.xml` are non-UI.)

### Admin pages audited — 13 modules (all of them, one route `/admin`)
Dashboard · RFQ & Leads · All Enquiries · Website Content (company, about, manufacturing, branding, SEO, locations) · Homepage & Hero · Products · **Certifications & Bankability** · Gallery · Events · Team Members · Resources · AI Creative Studio (+ report settings) · Settings

### Breakpoints tested
All twelve widths above, for every page. Mobile = 320–430, large phone = 480–576, tablet = 768–1024, laptop = 1280–1366, desktop = 1440–1920.

---

## 2. Findings before the fix

| # | Page | Defect | Widths |
|---|---|---|---|
| 1 | **Admin → Certifications** | Form grid collapsed to one implicit 600 px column inside a 362 px card; inputs, selects, hints and the logo row all overflowed and were clipped. No field styling existed at all. | 320–820 |
| 2 | **Admin → Certifications** | Records table had no styling and no min-width, so the last columns (Published, Actions) were unreachable. | 320–820 |
| 3 | `/compare` | `overflow:hidden` on the table frame clipped the HJT and Bifacial columns — content unreachable at every width below 768 px. | 320–768 |
| 4 | `/contact` | The three business-location CTAs were laid out in a row inside a 374 px column, pushing two of them outside the panel and the page. | 320–576 |
| 5 | `/contact` | The 46 px business name was wider than its column and clipped at desktop widths too. | 320–1920 |
| 6 | `/` (home) | Manufacturing card exceeded the viewport (298 px content in a 288 px card). | 320 |
| 7 | `/` (home) | Event carousel used a negative inline margin and hung 4 px past the viewport. | 320–430 |
| 8 | `/certifications` | Certification group card's min-content escaped the viewport. | 320 |
| 9 | `/solar-calculator` | Tool columns were `1fr` tracks, so the form could not shrink below its content. | 320 |
| 10 | All admin + several public pages | 600 instances of text below 11.5 px (9.28–11.2 px): badges, table headers, stat captions, category chips. | ≤576 |
| 11 | All pages | 662 instances of interactive targets under 30 px tall (breadcrumbs, footer links, CTA text links, card actions, map controls). | ≤576 |
| 12 | Admin | Duplicate/conflicting form-grid definitions in three stylesheets; the cert grid had been left in the public RFQ stylesheet with no field rules. | — |

Console/runtime: 12 client errors recorded before the fix, all caused by the audit harness's own incomplete stand-in responses (fixed in the harness), none in product code.

---

## 3. What was changed (root causes, not overrides)

**Admin**
- The certification editor now has field styling: `.cert-admin-grid > label`, inputs/selects/textareas at 44 px height, `aria-invalid` borders, hints, errors and focus rings.
- One owner for admin form grids: `.admin-form-grid` and `.cert-admin-grid` moved into `admin-dashboard.css` with `minmax(0,1fr)` tracks and an 820 px single-column collapse. The duplicate definitions in `admin-products.css` and `compliance-rfq.css` were deleted.
- Cert logo row and controls wrap (`flex-wrap`, `flex: 1 1 190px`) instead of forcing the card wider.
- Bare tables inside `.enterprise-card` are styled and scroll inside their card; below 1024 px the first column is pinned so rows stay identifiable while scrolling to the action buttons.
- Phone rules: 16 px form controls (prevents iOS zoom), `.wizard-actions` stack full-width, card header buttons get a 34 px target.

**Public**
- `.compare-table` scrolls inside its rounded frame below 900 px with a 720 px minimum row.
- Business-location actions stack in one column at every width; heading clamped to `clamp(1.5rem, 2.4vw, 2.1rem)` with `overflow-wrap:anywhere`.
- Homepage manufacturing card and `premium-event-track` use bounded tracks and no negative margins.
- `.certification-groups`, `.certification-records`, `.tool-workspace` and premium grids use `minmax(0,…)` tracks.
- 12 px floor for small caps labels and badges; 40–44 px touch areas for standalone action links, map controls and card actions — inline links inside running copy deliberately untouched.

**Kept unchanged:** all content, product/certification data, imagery, colours (navy / white / orange / grey), typography families, routes, components, API contracts, DB schemas, business logic. CSS only — no new dependencies, no JSX rewrites, no new components.

---

## 4. Certification page — before / after

| | Before | After |
|---|---|---|
| Form width @390 px | 600 px of content in a 362 px card — **clipped** | 362 px, 16 fields all inside the card |
| Field styling | none (inline labels, browser-default controls) | labels above fields, 44 px controls, hints, errors, focus rings |
| Columns | 1 implicit overflowing column | 2 columns ≥ 820 px, 1 column below |
| Logo control | fixed row that widened the card | wraps, 190 px min basis |
| Records table | unstyled, no min-width, actions unreachable | styled, scrolls in-card, sticky first column < 1024 px |
| Save / Reset @390 px | full-width stacked | full-width stacked (unchanged, verified) |
| Page overflow @390 px | element overflow + clipped container | 0 |

Screenshots: `/tmp/audit/shots/before/cert-certifications-{390,576,768,1280}.png` and `/tmp/audit/shots/final/cert-certifications-{390,576,768,1280}.png` (sandbox paths; re-runnable with the harness commands below).

---

## 5. Measured results (420 measurements per run)

| Metric | Before | After |
|---|---|---|
| Page-level horizontal overflow | 2 | **0** |
| Overflowing elements (outside a scroller) | 154 | **0** |
| Clipped containers (content hidden with no scroll) | 56 | **0** |
| Text < 11.5 px @ ≤576 px | 600 | **0** |
| Targets < 30 px @ ≤576 px | 662 | 29 (all inline text links in running copy) |
| Console errors (product code) | 0 | **0** |
| Failed requests | 0 | **0** |
| Affected page/width combinations | 26 (19 pages) | **0** |

Per-device status: **mobile 320/360/375/390/430 — pass · large phone 576 — pass · tablet 768/1024 — pass · laptop 1280/1366 — pass · desktop 1440/1920 — pass.**

---

## 6. Functional verification (42/42 passed)

- Admin mobile drawer opens/closes (sidebar in view, overlay present, closes via overlay) @390.
- Certifications: form fits the card @390 and @1280; create persists and shows success notice; edit prefills and offers "Cancel edit"; delete opens an `alertdialog` inside the viewport with Cancel/Confirm.
- All Enquiries: typed search filters rows (14 → matching rows), pagination moves to page 2, detail modal fits the viewport with internal scroll and a reachable footer.
- RFQ & Leads: table renders with inner horizontal scroll, priority pills styled, detail modal opens.
- Products, Gallery, Events, Team, Resources, Website Content, Homepage & Hero, AI Creative Studio, Settings: render with data and zero overflow @390 and @1280.
- Public mobile navigation opens inside the viewport @320 / 390 / 768.
- `/quote` form: 18 fields, all inside 320 px, no page overflow.

No destructive operations were performed on real data: the audit ran against an in-memory stand-in API that mirrors the real response shapes, so every client flow, state and layout was exercised with genuine HTTP round-trips.

---

## 7. Build / type / lint / test

```
npm run build      ✓ Compiled successfully (webpack, 31 routes)
tsc --noEmit       ✓ clean
npm run lint       ✓ 0 errors, 22 pre-existing no-img-element warnings
node --test tests/*.test.mjs                      63 pass / 0 fail
node --test backend/services backend/routes        114 pass / 0 fail
```

---

## 8. Remaining issues (honest list)

1. **29 inline links in running copy** are under 30 px tall on phones (footer contact link, privacy/terms links inside the footer line, email links inside paragraphs, tel: links inside table cells). WCAG 2.2 AA target-size makes an exception for links inside a sentence, so these were left at their text size rather than forcing line boxes apart.
2. **Wide admin tables intentionally scroll** below 1024 px (RFQ, Enquiries, Certifications, Resources, Events, Team, Reports, Logs). A card-per-row layout for every module would be a larger structural change; the scroll container, pinned first column and always-reachable action column are in place.
3. **Admin auth could not be exercised end-to-end against the real backend** in this environment (no MongoDB binary available). Screen rendering and client flows were verified through the app's real auth gate using its documented session path against the stand-in API; the login form itself was not re-tested against production credentials.
4. **Public pages that render live backend data** (`/gallery`, `/resources`, `/events`, `/certifications`) were tested with representative records; very long customer-supplied strings beyond the samples used (titles, filenames, emails) rely on the `overflow-wrap`/`min-width:0` rules added here rather than on per-record testing.
5. **Untested environments:** Safari/iOS and Firefox were not available in the sandbox; all verification used Chromium. The `100dvh`/safe-area rules were not visually confirmed on a real device.

---

## 9. Files modified (13 total, all CSS)

```
app/admin-cards.css        +9 / −7    admin card micro-labels, thumb badge
app/admin-dashboard.css    +80 / −13  cert form styling, shared form grid, table
                                      scrolling + sticky column, phone rules,
                                      badge/label sizes, touch targets
app/admin-products.css     −2         duplicate .admin-form-grid removed
app/admin-site-cms.css     ±1         CMS kicker size
app/compliance-rfq.css     +5 / −4    cert grid removed (moved to admin layer),
                                      RFQ pill + verification chip sizes
app/creative-admin.css     +3 / −3    creative studio kickers, card action targets
app/document-gallery.css   +2 / −2    document card label sizes
app/globals.css            +4 / −4    legacy public section micro-labels
app/premium-home.css       +4 / −4    event carousel margin, bounded tracks
app/solarious-ui.css       +100 / −29 compare table scroll, location actions,
                                      bounded grid tracks, touch targets, label floor
app/team.css               ±1         team role label size
app/usability.css          ±1         gallery category chip size
app/whatsapp-contact.css   +4 / −2    premium WhatsApp link size + 44px target
```

No component, route, API, schema, config or dependency was changed.

---

## 10. How to re-run the verification

```bash
# stand-in API (no MongoDB in this sandbox) + production build
node /tmp/harness/stub-api.mjs                                   # :3100
BACKEND_API_URL=http://127.0.0.1:3100 NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
  npm run build && npx next start -H 0.0.0.0 -p 3000

# 420-measurement sweep, 42 interaction checks, screenshots
LD_LIBRARY_PATH=/tmp/nssstub node /tmp/audit/sweep.mjs --tag=now --shots
LD_LIBRARY_PATH=/tmp/nssstub node /tmp/audit/functional.mjs
LD_LIBRARY_PATH=/tmp/nssstub node /tmp/audit/shots.mjs --tag=now --set=cert
```

Harness files are sandbox-only (`/tmp`), not part of the repository.

---

**Git:** branch `arena/c5da0452-solariousbackend` → PR #10 (`521d6bc`) and PR #11 (`0746e8e`) merged into `main`. Nothing was deployed.
