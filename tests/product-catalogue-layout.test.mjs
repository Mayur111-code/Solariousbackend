import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The catalogue is a two-column grid: a 292px filter rail beside the results.
 * CSS auto-placement fills (1,1), (1,2) and then (2,1) — so with three grid
 * children the product cards used to drop into the narrow rail underneath the
 * filters and the whole right-hand column rendered empty. These assertions
 * keep the results column pinned to column 2 at every breakpoint.
 */
test("the filter rail is the only catalogue child allowed in column 1", async () => {
  const css = await read("app/product-system.css");
  /* Top-level rules only — the breakpoint overrides are asserted separately. */
  const topLevel = css.slice(0, css.indexOf("@media (max-width: 1200px)"));
  const block = [...topLevel.matchAll(/\.ps-catalogue[^{]*\{[^}]*\}/g)]
    .map((match) => match[0])
    .join("\n");

  assert.match(block, /\.ps-catalogue \{\s*display:\s*grid/);
  assert.match(block, /grid-template-columns:\s*292px minmax\(0,\s*1fr\)/);

  /* Default every child into the results column, then exempt the rail. The
     exemption must be more specific than the default or it will not win. */
  const childDefault = block.indexOf(".ps-catalogue > *");
  const railRule = block.indexOf(".ps-catalogue > .ps-filter-panel");
  assert.ok(childDefault > -1, "a default grid-column for catalogue children is required");
  assert.ok(railRule > -1, "the filter rail needs an explicit column-1 rule");
  assert.ok(
    block.slice(childDefault, railRule).includes("grid-column: 2"),
    "unclassified catalogue children must fall in the results column, not the rail",
  );
  assert.match(block.slice(railRule, block.indexOf(".ps-catalogue > .ps-catalogue-results")), /grid-column:\s*1/);
});

test("the results count and the card grid render inside one results wrapper", async () => {
  const filters = await read("components/product-filters.tsx");
  const wrapper = filters.indexOf('className="ps-catalogue-results"');
  assert.ok(wrapper > -1, "ps-catalogue-results wrapper is missing");
  assert.ok(
    filters.indexOf("ps-results-count") > wrapper,
    "the results count must live inside the results column",
  );
  assert.ok(
    filters.indexOf("ps-card-grid") > wrapper,
    "the card grid must live inside the results column",
  );
  /* Two grid children only: rail + results. */
  const directChildren = filters
    .slice(filters.indexOf('className="ps-catalogue"'))
    .match(/^\s{6}<div className="ps-(filter-panel|catalogue-results)"/gm);
  assert.equal(directChildren?.length ?? 0, 2, "the catalogue must have exactly two grid children");
});

test("the single-column breakpoint releases the explicit placements", async () => {
  const css = await read("app/product-system.css");
  const start = css.indexOf("@media (max-width: 1080px)");
  assert.ok(start > -1, "the 1080px stacking breakpoint is missing");
  const media = css.slice(start, css.indexOf("@media", start + 10));
  assert.match(media, /\.ps-catalogue\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(
    media,
    /\.ps-catalogue > \*[\s\S]*?grid-column:\s*1/,
    "children must be released to column 1 or they will overlap in row 1",
  );
  assert.match(media, /grid-row:\s*auto/);
  assert.match(media, /\.ps-filter-panel\s*\{\s*position:\s*static/);
});

test("a catalogue with no published variants never prints a 0-0 Wp window", async () => {
  const listing = await read("components/product-listing-view.tsx");
  assert.doesNotMatch(
    listing,
    /\{minPower\}–\{maxPower\}/,
    "the raw min/max pair renders '0–0 Wp' when a catalogue has no variants",
  );
  assert.match(listing, /const powerWindow =/);
  assert.match(listing, /powerWindow \? \(/);
  assert.match(listing, /On request/);
});

test("legacy product records keep their category, label and warranty aligned", async () => {
  const products = await read("lib/products.ts");
  /* A record whose stored category does not match a catalogue slug used to
     link to /products/mono-perc while its card badge read the generic
     "Solar module" fallback. Both now come from one resolved category. */
  assert.match(products, /PRODUCT_CATEGORIES\.find\(\(item\) => item\.slug === fallback\?\.category\)/);
  assert.match(products, /categoryLabel: category\?\.label/);
  /* Old records keep both warranty clauses in one run-on sentence. */
  assert.match(products, /function splitLegacyWarranty/);
  assert.match(products, /performance\|linear\|yield\|degradation/);
  assert.match(products, /product\|workmanship\|material/);
  /* No stored power range and variants present: derive it from the variants. */
  assert.match(products, /const derivedPowerRange =/);
  assert.match(products, /str\(raw\.powerRange, fallback\?\.powerRange \?\? ""\) \|\| derivedPowerRange/);
});
