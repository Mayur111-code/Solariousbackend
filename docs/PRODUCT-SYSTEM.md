# Product system

Datasheet-driven product catalogue, public listing/detail pages and full admin
product management.

## Routes

| Route | Rendering | Purpose |
| --- | --- | --- |
| `/products` | dynamic (server) | Full catalogue, filters, category navigation, positioning content |
| `/products/[category]` | dynamic | Category landing (`mono-perc`, `hjt`, `bifacial`, `topcon`) |
| `/products/[category]/[slug]` | dynamic | Product detail (specifications, variants, documents, FAQs, enquiry) |

### Category naming

The brief calls the families **Monocorn**, **HJT**, **Bifacial** and **Topcorn**.
The datasheets and the live site use *Mono PERC* and *TOPCon*, so those remain
the canonical URL segments and the display labels use the brand spelling:

| Slug (URL) | Display label |
| --- | --- |
| `mono-perc` | Monocorn |
| `hjt` | HJT |
| `bifacial` | Bifacial |
| `topcon` | Topcorn |

`/products/monocorn` and `/products/topcorn` are accepted aliases and 307 to
the canonical slug (`resolveCategorySlug` in `lib/products.ts`), so either
spelling reaches the right page. Labels can be changed from the admin panel
without a deploy — see *Category management*.

### Redirects

Legacy `/products/<slug>` URLs redirect: a segment that matches a product slug
is forwarded to `/products/<category>/<slug>`. `/products/<category>` itself is
a valid page, so the four original URLs (`/products/mono-perc`, `/products/topcon`,
`/products/hjt`, `/products/bifacial`) keep working. A product slug opened under
the wrong category redirects to its canonical nested URL.

## Visual design

`app/product-system.css` is a scoped `.ps-*` layer loaded last in
`app/layout.tsx`. Tokens live on `.ps-page`.

| Token | Value | Use |
| --- | --- | --- |
| `--ps-navy-900` | `#001736` | hero band, dark sections, CTA band |
| `--ps-blue-600` | `#0267B5` | links, accents, active states |
| `--ps-teal-500` | `#0F9B8E` | secondary accent, icons |
| `--ps-gold-500` | `#F5B52E` | primary button, hero figures |
| `--ps-tint` | `#F6F9FE` | page wash / soft blue gradient |
| `--ps-radius-lg` | `26px` | cards, panels |

Rules the layer follows: one full-bleed navy band per page, white sections below
with a soft blue wash, glass cards (translucent white + blur + hairline border),
soft low-spread shadows, generous whitespace, and nothing that scrolls
horizontally except deliberately scrollable tables, galleries and the mobile tab
strip.

### Motion

Framer Motion is used for four things only, via `components/product-motion.tsx`:

- `HeroReveal` — entrance for the hero columns,
- `Reveal` — section reveal on scroll (`whileInView`, once),
- sliding highlight behind the active tab (`layoutId`),
- cross-fade when the gallery image changes.

`useReducedMotion` short-circuits every animation, and the stylesheet has its
own `prefers-reduced-motion` block as a second line of defence.

## Page structure

Product detail renders the sections in this order, each one anchored for the
sticky tab strip:

| Tab | Anchor | Content |
| --- | --- | --- |
| — | — | breadcrumb + navy hero (copy · image · three spec cards) |
| Overview | `#overview` | positioning copy, four highlight cards, technical visual + technology / module type / cell technology |
| Technical Specs | `#specifications` | six datasheet tables with variant switching |
| Variants | `#variants` | every published power class with STC values + tolerance |
| Features | `#features` | datasheet feature tiles, configuration notes, benefit cards |
| Certifications | `#certifications` | standards printed on the sheet |
| Resources | `#resources` | datasheet preview / download / open-in-new-tab |
| — | `#related`, `#enquiry` | related modules, enquiry form |

Tabs are hidden automatically when their section has no content (for example
HJT and TOPCon have no specification or variant tab).

## Data flow

1. `data/product-catalog.ts` — canonical TypeScript shape plus the seed
   catalogue transcribed from the two PDFs in `public/datasheets/`
   (`solarious-g2b-sheet.pdf`, `solarious-mono-facial-sheet.pdf`).
2. `lib/products.ts` — server-only loader. Reads `GET /api/products`, merges the
   response over the matching seed record, drops drafts/archived records and
   falls back to the seed catalogue if the API is unavailable or empty. The page
   therefore never renders empty because of a backend hiccup.
3. `backend/services/products.mjs` — shared validation/normalisation used by the
   public and admin endpoints (payload caps, slug rules, query builder,
   duplicate helper). Unit-tested in `backend/services/products.test.mjs`.

### Spec provenance

Every numeric value in the published series comes from a Solarious datasheet.
Values that are inconsistent on the printed sheet are **not** silently fixed;
they are listed in `reviewNotes` and rendered as a "datasheet values awaiting
confirmation" callout on the product page:

- G2B 490–510 Wp and 425–460 Wp have swapped cell-count rows relative to their
  own titles/model numbers.
- The 425–460 Wp Voc ladder is not monotonic.
- The linear-performance chart ends at year 27 while the warranty headline says
  30 years.

HJT and TOPCon have no datasheet yet, so they publish qualitative content only
(`specsPending: true`, zero spec tables, zero variants, no documents).

## Database

`Product` (MongoDB collection `products`) keeps every legacy field and adds:

```
category            // "mono-perc" | "hjt" | "bifacial" | "topcon"
highlights[]        // { title, description }
benefits[]          // { title, description }
keySpecs[]          // { label, value }
variants[]          // { id, label, power, voc, isc, vmp, imp, efficiency, tolerance }
specTables[]        // { id, title, description, columns[], rows[{label, values[]}], note, matrix }
documents[]         // { title, url, fileSize, kind, storageId }
faqs[]              // { question, answer }
certifications[]    // string
reviewNotes[]       // string
specsPending        // boolean
seo                 // { title, description, keywords[] }
warranty            // { product, performance, note } (legacy string accepted)
powerTolerance        // string, e.g. "0 to +5 W" — third hero specification card
configurationNotes[]  // string — per-series bullets from that module's own page
powerRange, efficiencyRange, powerMin, powerMax
```

A separate `ProductCategory` collection stores **overrides** for the four fixed
category routes:

```
slug            // enum: mono-perc | hjt | bifacial | topcon
label, tagline, description, technology, image, accent
highlights[]    // string
published, displayOrder
```

The collection may be empty — that is a valid state, and the code defaults in
`data/product-catalog.ts` apply. Deleting an override restores the default; it
never deletes products.

`status` (`draft|published|archived`) and `published` stay in sync. Existing
documents are untouched: no migration is required, and records saved before this
release keep working because `lib/products.ts` merges them over the seed record.

Legacy category placeholder records (`slug` equal to a category slug) are no
longer seeded. If an older deployment still has them, they stay visible and
editable in the admin panel but are filtered out of the public catalogue.

## API

Public (no auth):

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products` | `category`, `technology`, `moduleType`, `search`, `minPower`, `maxPower`, `featured`, `page`, `limit` |
| GET | `/api/products/categories` | published counts per category, merged with any saved category overrides |
| GET | `/api/products/:slug` | published product only |

Admin (session cookie required):

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/products` | full list, drafts included |
| GET | `/api/admin/products/stats` | totals, status counts, per-category counts, pending specs |
| GET | `/api/admin/products/:id` | single record |
| POST | `/api/admin/products` | create (validated, slug uniqueness) |
| PUT | `/api/admin/products/:id` | update (partial payload allowed) |
| PATCH | `/api/admin/products/:id` | `{ action: "publish" \| "unpublish" \| "draft" \| "archive" }` or `{ status }` |
| POST | `/api/admin/products/:id/duplicate` | copies the record as a draft with a unique slug |
| DELETE | `/api/admin/products/:id` | delete + asset cleanup |
| PUT/DELETE | `/api/admin/products` | legacy slug-keyed endpoints, still supported |
| GET | `/api/admin/categories` | the four categories with their current override state |
| PUT | `/api/admin/categories` | upsert an override (validated by `normaliseCategoryPayload`) |
| DELETE | `/api/admin/categories?slug=` | clear the override so the code default applies |

Uploads reuse the existing secured flows: `upload-image` (multipart, type/size
checked, re-validated server-side) and `datasheet-signature` →
`verify-datasheet` (signed direct upload, server-side `%PDF-` check, 20 MB cap).

Publishing is blocked without a usable image, at both the route layer and the
editor.

## Admin UI

`/admin` → **Products** tab:

- counters (total / published / draft / archived), per-category breakdown,
  pending-specification warning;
- search + status + category filters;
- per-row actions: Edit, Duplicate, Publish/Unpublish, Archive/Restore, View,
  Delete;
- eleven-section editor:
  1. basic information,
  2. images & gallery,
  3. wattage & key specifications (power range, efficiency range, power
     tolerance, key specification cards),
  4. technical specifications (flexible groups — add any number of tables, rows
     and columns without touching code),
  5. variants,
  6. features & benefits (datasheet features, configuration notes, benefits),
  7. certifications,
  8. warranty details (product, linear performance, caveat, data-review notes,
     specifications-pending flag),
  9. datasheet & PDF documents,
  10. FAQs,
  11. SEO & publishing;
- Save draft / Publish with inline validation.

### Category management

"Manage categories" in the Products tab edits the copy for each category page:
label, tagline, technology line, description, hero image, accent, highlight
bullets and published state. The four slugs are route segments and cannot be
created or deleted; "Reset to default" clears the override.

## Verified datasheet claims

The cover page of every Solarious module datasheet prints four features and four
benefits. They are stored once (`DATASHEET_FEATURES` / `DATASHEET_BENEFITS` in
`data/product-catalog.ts`) and attached to every datasheet-backed series:

- Features: PID Free / Low LID Protection · Positive Tolerance @ 0~5W · 100%
  In-Line Hi-Pot Testing · M10 MONO-PERC
- Benefits: Super Performance · Quality Materials · Advanced Technology ·
  Warranty and Support

Series-specific bullets (cell count, reverse current, frame finish) live in
`configurationNotes` so they stay attached to the module they came from.

## Tests

```
node --test tests/*.test.mjs          # 75 (includes catalogue integrity + datasheet claims)
npm --prefix backend test             # 136 (includes product + category payload rules)
npm run build && npx tsc --noEmit && npm run lint
```

Interactive checks run against a stub API in jsdom (see the report for the
session that produced them): 44 UI checks and 16 admin CRUD/authorisation
checks.
