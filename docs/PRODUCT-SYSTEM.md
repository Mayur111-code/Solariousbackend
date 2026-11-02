# Product system

Datasheet-driven product catalogue, public listing/detail pages and full admin
product management.

## Routes

| Route | Rendering | Purpose |
| --- | --- | --- |
| `/products` | dynamic (server) | Full catalogue, filters, category navigation, positioning content |
| `/products/[category]` | dynamic | Category landing (`mono-perc`, `hjt`, `bifacial`, `topcon`) |
| `/products/[category]/[slug]` | dynamic | Product detail (specifications, variants, documents, FAQs, enquiry) |

Legacy `/products/<slug>` URLs redirect: a segment that matches a product slug
is forwarded to `/products/<category>/<slug>`. `/products/<category>` itself is
a valid page, so the four original URLs (`/products/mono-perc`, `/products/topcon`,
`/products/hjt`, `/products/bifacial`) keep working.

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
powerRange, efficiencyRange, powerMin, powerMax
```

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
| GET | `/api/products/categories` | published counts per category |
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
- nine-section editor: basic information, images, highlights/features,
  specification groups (with a "add standard groups" helper), variants,
  benefits/certifications, datasheets & PDFs, FAQs, SEO & publishing;
- Save draft / Publish with inline validation.

## Tests

```
node --test tests/*.test.mjs          # 72 (includes product catalogue integrity)
npm --prefix backend test             # 132 (includes product payload rules)
npm run build && npx tsc --noEmit && npm run lint
```
