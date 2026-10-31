# Solarious Energy — Premium UI redesign

A UI/UX redesign of the existing site only. No routes, content, product data,
image URLs, API contracts, database schemas or admin behaviour were changed.

## 1. Design language

| Token | Value | Use |
| --- | --- | --- |
| `--navy-950` | `#041326` | Top contact bar, footer |
| `--navy-900` | `#061b36` | Primary dark surfaces, CTA bands |
| `--navy-800` | `#0b2c52` | Secondary navy, gradients |
| `--gold-500` | `#f5b52e` | Primary buttons, accents, active states |
| `--gold-700` | `#b07a12` | Gold text on light surfaces (contrast safe) |
| `--sky-50` | `#f4f8fc` | Alternating section background |
| `--slate-900` / `--slate-500` | `#102a4c` / `#5b7188` | Headings / body copy |
| `--line-soft` | `#e2ebf4` | Card and divider borders |

Supporting characteristics: 14–26 px radii, `0 14px 34px rgba(6,27,54,.07)`
resting shadow and a deeper hover shadow, 1240 px content measure, fluid
`clamp()` section rhythm (64 → 118 px), 76 px navigation (66 px on scroll),
44 px logo cap, and gold 3 px active-nav indicator.

All motion is eased with `cubic-bezier(.22,.61,.36,1)` and is fully removed
under `prefers-reduced-motion: reduce`.

## 2. How the redesign is implemented

The site is a Next.js App Router project with a large legacy stylesheet stack
(`globals.css` plus ~25 override files) and shared page shells. Rather than
rewriting every page's markup, the redesign adds one final layer:

```
app/solarious-ui.css      ← loaded last in app/layout.tsx
```

It re-tokenises the brand variables (`--orange`, `--ink`, `--cream`, `--green`,
`--premium-*`) and restyles the shared class contract that every page already
uses (`.content-section`, `.content-card`, `.product-card`, `.button`,
`.site-footer`, `.premium-inner-hero`, …). That keeps every route, form,
gallery lightbox, RFQ wizard step and admin action intact while giving the whole
public site a single visual language.

Markup changes were limited to the places where layout genuinely had to move:

| File | Change |
| --- | --- |
| `app/layout.tsx` | Imports `solarious-ui.css` last; passes company CMS data to the header |
| `components/site-header.tsx` | New `TopContactBar` (tagline · phone · email · socials), 76 px white sticky nav, gold pill CTA, rebuilt mobile drawer |
| `components/hero-slider.tsx` | Adds the capability highlight row (gold-ringed icons) under the hero CTAs |
| `components/premium-product-showcase.tsx` | Tabbed single panel → four-card responsive product grid + section CTA row |
| `components/site-footer.tsx` | Adds a "Back to top" control in the legal row |
| `app/page.tsx` | Removes one inline style so the certification note follows the theme |

Every other page inherits the redesign through shared components:
`PageShell` / `ToolPageShell` / `SectionPage` → `InnerPageHero` → content
surfaces.

## 3. Component map (requested name → implementation)

| Requested | Where |
| --- | --- |
| PremiumHeader | `components/site-header.tsx` (`header.site-header`) |
| TopContactBar | `TopContactBar` inside `site-header.tsx` |
| ResponsiveNavigation | `.desktop-nav` + `DesktopMenu`, mobile `Sheet` drawer |
| HeroSection | `components/hero-slider.tsx` (home), `components/inner-page-hero.tsx` (inner) |
| SectionHeading | `.premium-heading-row` + `.premium-kicker` pattern |
| ProductCard / ProductGrid | `components/product-card.tsx`, `components/product-catalog.tsx`, `components/premium-product-showcase.tsx` |
| ManufacturingShowcase | `.premium-manufacturing` (home), `.manufacturing-editorial-*` (`/manufacturing`) |
| CertificationCard | `.certification-card` / `.compliance-ribbon-item` |
| ProjectGallery | `components/public-gallery.tsx` |
| PremiumCTA | `.premium-contact-cta`, `.wide-cta`, `.premium-wide-cta` |
| ContactCard | `contact-layout` + `contact-form.tsx` |
| PremiumFooter | `components/site-footer.tsx` |
| BackToTopButton | `.footer-top-link` in the footer legal row |

No new dependencies were added and no framework migration was performed.

## 4. Pages covered

Home · About · Products · Product detail (`/products/[slug]`) · Manufacturing ·
Projects · Gallery · Resources · Events · Event detail · Contact · Get a Quote
(RFQ) · Certifications · Services · Quality · Sustainability · Compare ·
Solar Calculator · Module Recommender · Solar Recommendation · Privacy Policy ·
Terms · Admin (inherits typography only).

## 5. Responsive behaviour

Breakpoints: 1320 px (desktop nav → drawer), 1200 px (product grid 4 → 2),
1050 px (manufacturing stack, footer 5 → 2 columns), 900 px (content grid 3 → 2),
760 px (single column, gallery/events become swipe tracks), 560 px (header CTA
moves into the drawer, single-column product grid), 540 px (footer 1 column).

Test widths targeted: 1920, 1440, 1366, 768, 430, 390, 360.

## 6. Verification performed

- `npm run build` — success, 31 routes.
- `tsc --noEmit` — clean.
- `eslint .` — 0 errors (22 pre-existing `<img>` / hook warnings).
- Every public route returns 200 through the running server; `/admin` correctly
  returns 307 to the sign-in page.
- All 29 internal links rendered on the homepage resolve (200, or 307 for
  `/admin`).
- CSS cascade confirmed: the new stylesheet is the last chunk emitted, so its
  rules win over the legacy layer.

## 7. Known limitations

- No headless browser is available in this environment, so the redesign was
  verified through the production build, rendered HTML and CSS cascade rather
  than pixel screenshots.
- `/quote` submission still requires a reachable MongoDB (see
  `docs/RFQ-PLATFORM.md`); the wizard UI itself renders and validates fully.
- Certification logo artwork is not displayed because the registry contains no
  verified logo assets — showing unverified marks would breach the project's
  "never claim unverified certifications" rule.
