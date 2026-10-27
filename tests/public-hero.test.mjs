import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const publicPath = (path) => fileURLToPath(new URL(`../public/${path}`, import.meta.url));

test("the shared public hero uses a full-bleed Next image, overlay and configurable CTAs", async () => {
  const [component, css, layout, presets] = await Promise.all([
    read("components/inner-page-hero.tsx"),
    read("app/public-hero.css"),
    read("app/layout.tsx"),
    read("lib/public-hero.ts"),
  ]);

  assert.match(layout, /import "\.\/public-hero\.css"/);
  assert.match(component, /from "next\/image"/);
  assert.match(component, /sizes="100vw"/);
  assert.match(component, /priority=\{priority\}/);
  assert.match(css, /object-position: var\(--public-hero-position, center\)/);
  assert.match(css, /object-position: var\(--public-hero-position-mobile/);
  assert.match(component, /public-hero-media/);
  assert.match(component, /public-hero-overlay/);
  assert.match(component, /overlay-\$\{overlay\}/);
  assert.match(component, /hero-align-\$\{align\}/);
  assert.match(component, /public-hero-compact/);
  assert.match(component, /mobileImagePosition/);
  assert.match(component, /allowedHeroImage/);
  assert.match(component, /function HeroCtaLink/);
  assert.match(component, /variant: primaryCta\.variant \?\? "primary"/);
  assert.match(component, /variant: secondaryCta\.variant \?\? "secondary"/);
  assert.match(component, /function Breadcrumb/);
  assert.match(component, /res\\\.cloudinary\\\.com/);

  assert.match(css, /\.premium-inner-hero\.public-hero/);
  assert.match(css, /object-fit: cover/);
  assert.match(css, /linear-gradient\(/);
  assert.match(css, /\.public-hero\.overlay-light/);
  assert.match(css, /\.public-hero\.overlay-medium/);
  assert.match(css, /\.public-hero\.overlay-strong/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.public-hero \.button\.hero-outline/);
  assert.match(css, /min-height: 48px/);

  for (const prop of [
    "image",
    "imagePosition",
    "mobileImagePosition",
    "overlay",
    "align",
    "compact",
    "breadcrumb",
    "primaryCta",
    "secondaryCta",
  ]) {
    assert.match(presets, new RegExp(`\\b${prop}\\??:`));
  }
});

test("all hero presets use existing local assets and real application routes", async () => {
  const presets = await read("lib/public-hero.ts");
  const images = [...presets.matchAll(/image:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(images.length >= 15, `expected a broad set of page images, found ${images.length}`);
  await Promise.all(
    images.map((image) =>
      assert.doesNotReject(
        access(publicPath(image.replace(/^\//, ""))),
        `Missing hero image: ${image}`,
      ),
    ),
  );

  const allowedRoutes = new Set([
    "/",
    "/about",
    "/services",
    "/products",
    "/manufacturing",
    "/projects",
    "/gallery",
    "/contact",
    "/quote",
    "/compare",
    "/solar-calculator",
    "/module-recommender",
    "/solar-recommendation",
    "/events",
    "/quality",
    "/sustainability",
    "/privacy-policy",
    "/terms",
  ]);
  const hrefs = [...presets.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (href.startsWith("/")) {
      assert.ok(allowedRoutes.has(href), `CTA points to an unknown route: ${href}`);
    } else {
      assert.equal(href, "https://wa.me/919664379011");
    }
  }
  assert.match(presets, /WHATSAPP_LABEL/);
  assert.doesNotMatch(presets, /https?:\/\/(?!wa\.me\/|res\.cloudinary\.com\/)/);
});

test("all public pages route their hero through the shared system", async () => {
  const homepage = await read("app/page.tsx");
  assert.match(homepage, /<HeroSlider banners=\{banners\} \/>/);
  assert.doesNotMatch(homepage, /InnerPageHero/);

  const wrapperPages = {
    "app/about/page.tsx": /<PageShell/,
    "app/contact/page.tsx": /<PageShell/,
    "app/gallery/page.tsx": /<PageShell/,
    "app/products/page.tsx": /<PageShell/,
    "app/services/page.tsx": /<SectionPage/,
    "app/projects/page.tsx": /<SectionPage/,
    "app/quality/page.tsx": /<SectionPage/,
    "app/sustainability/page.tsx": /<SectionPage/,
    "app/compare/page.tsx": /<ToolPageShell/,
    "app/solar-recommendation/page.tsx": /<ToolPageShell/,
    "app/manufacturing/page.tsx": /<InnerPageHero/,
    "app/quote/page.tsx": /<InnerPageHero/,
    "app/events/page.tsx": /<InnerPageHero/,
    "app/events/[slug]/page.tsx": /<InnerPageHero/,
    "app/privacy-policy/page.tsx": /<InnerPageHero/,
    "app/terms/page.tsx": /<InnerPageHero/,
    "app/not-found.tsx": /<InnerPageHero/,
    "components/product-detail.tsx": /<InnerPageHero/,
    "components/solar-calculator.tsx": /<ToolPageShell/,
    "components/module-recommender.tsx": /<ToolPageShell/,
  };

  for (const [file, expected] of Object.entries(wrapperPages)) {
    const source = await read(file);
    assert.match(source, expected, `${file} must use the shared hero system`);
    assert.doesNotMatch(source, /className="events-hero|className="tool-hero|<h1>|<h1 /, `${file} must not keep a bespoke H1 hero`);
  }

  const [pageShell, sectionPage, toolPageShell] = await Promise.all([
    read("components/page-shell.tsx"),
    read("components/section-page.tsx"),
    read("components/tool-page-shell.tsx"),
  ]);
  assert.match(pageShell, /<InnerPageHero/);
  assert.match(sectionPage, /<PageShell/);
  assert.match(toolPageShell, /<InnerPageHero/);
  assert.match(toolPageShell, /compact = true/);
});

test("hero presets cover every applicable public page family", async () => {
  const presets = await read("lib/public-hero.ts");
  for (const key of [
    "about",
    "contact",
    "services",
    "products",
    "productDetail",
    "manufacturing",
    "projects",
    "gallery",
    "quality",
    "sustainability",
    "events",
    "eventDetail",
    "quote",
    "compare",
    "solarRecommendation",
    "solarCalculator",
    "moduleRecommender",
    "privacy",
    "terms",
    "notFound",
  ]) {
    assert.match(presets, new RegExp(`\\n  ${key}:\\s*\\{`));
  }
});
