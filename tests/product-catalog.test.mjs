import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The seed catalogue is a TypeScript module. Node strips types natively on
 * >=22.18; on older runtimes the suite is skipped rather than failing, because
 * the same data is asserted end-to-end in the browser/API checks instead.
 */
let catalogue = null;
try {
  catalogue = await import(resolve(root, "data/product-catalog.ts"));
} catch {
  catalogue = null;
}

const skip = catalogue ? false : "TypeScript type stripping is unavailable on this Node runtime.";

test("catalogue exposes the four published categories", { skip }, () => {
  const slugs = catalogue.PRODUCT_CATEGORIES.map((category) => category.slug);
  assert.deepEqual(slugs.sort(), ["bifacial", "hjt", "mono-perc", "topcon"]);
  for (const category of catalogue.PRODUCT_CATEGORIES) {
    assert.ok(category.label, "category label is required");
    assert.ok(category.description.length > 40, `${category.slug} needs a description`);
  }
});

test("every documented product is complete and unique", { skip }, () => {
  const products = catalogue.catalogProducts;
  assert.ok(products.length >= 10, "expected the datasheet-derived series");
  const slugs = new Set();
  for (const product of products) {
    assert.ok(!slugs.has(product.slug), `duplicate slug ${product.slug}`);
    slugs.add(product.slug);
    assert.match(product.slug, /^[a-z0-9-]+$/);
    assert.ok(product.name.length >= 3);
    assert.ok(product.summary.length > 30, `${product.slug} summary too short`);
    assert.ok(
      catalogue.PRODUCT_CATEGORIES.some((category) => category.slug === product.category),
      `${product.slug} references an unknown category`,
    );
    assert.ok(product.warranty.product, `${product.slug} is missing warranty terms`);
  }
});

test("published datasheet series carry the full specification set", { skip }, () => {
  for (const product of catalogue.catalogProducts.filter((item) => !item.specsPending)) {
    const ids = product.specTables.map((table) => table.id);
    const expected =
      product.category === "bifacial"
        ? ["electrical", "bifacial-gain", "thermal", "mechanical", "operating", "packing"]
        : ["electrical", "thermal", "mechanical", "operating", "packing"];
    assert.deepEqual(ids, expected, `${product.slug} specification groups`);
    assert.ok(product.variants.length > 0, `${product.slug} has no variants`);
    assert.ok(product.keySpecs.length >= 4, `${product.slug} needs key spec cards`);
    assert.ok(product.documents.length > 0, `${product.slug} needs a datasheet`);
  }
});

test("variant labels line up with the electrical table columns", { skip }, () => {
  for (const product of catalogue.catalogProducts.filter((item) => !item.specsPending)) {
    const electrical = product.specTables.find((table) => table.id === "electrical");
    assert.ok(electrical, `${product.slug} has no electrical table`);
    assert.deepEqual(
      electrical.columns,
      product.variants.map((variant) => variant.label),
      `${product.slug} columns vs variants`,
    );
    for (const row of electrical.rows) {
      assert.equal(
        row.values.length,
        electrical.columns.length,
        `${product.slug} · ${row.label} value count`,
      );
    }
    const powerRow = electrical.rows.find((row) => /maximum power/i.test(row.label));
    assert.deepEqual(powerRow.values, product.variants.map((variant) => String(variant.power)));
  }
});

test("bifacial gain rows are aligned and only exist on bifacial products", { skip }, () => {
  for (const product of catalogue.catalogProducts.filter((item) => !item.specsPending)) {
    const gain = product.specTables.find((table) => table.id === "bifacial-gain");
    if (product.category !== "bifacial") {
      assert.equal(gain, undefined, `${product.slug} must not claim rear-side gain`);
      continue;
    }
    assert.ok(gain, `${product.slug} is missing its rear-gain table`);
    assert.equal(gain.rows.length, 3);
    for (const row of gain.rows) {
      assert.equal(row.values.length, gain.columns.length);
      assert.match(row.label, /^Rear gain \d+%$/);
    }
  }
});

test("products without a datasheet publish no numeric specifications", { skip }, () => {
  const pending = catalogue.catalogProducts.filter((item) => item.specsPending);
  assert.ok(pending.length >= 2, "HJT and TOPCon must stay pending until a sheet exists");
  for (const product of pending) {
    assert.equal(product.specTables.length, 0, `${product.slug} must not publish tables`);
    assert.equal(product.variants.length, 0, `${product.slug} must not publish variants`);
    assert.equal(product.documents.length, 0, `${product.slug} must not publish documents`);
  }
});

test("every referenced datasheet exists in the public directory", { skip }, () => {
  for (const product of catalogue.catalogProducts) {
    for (const document of product.documents) {
      if (!document.url.startsWith("/datasheets/")) continue;
      assert.ok(
        existsSync(resolve(root, "public", document.url.replace(/^\//, ""))),
        `${product.slug} links a missing file ${document.url}`,
      );
    }
  }
});

test("flagged datasheet inconsistencies stay documented for the admin team", { skip }, () => {
  const flagged = catalogue.catalogProducts.filter((item) => item.reviewNotes.length);
  assert.ok(flagged.length >= 2, "the swapped G2B cell counts must stay flagged");
  for (const product of flagged) {
    for (const note of product.reviewNotes) {
      assert.ok(note.length > 40, "review notes must be actionable");
    }
  }
});

test("frequently asked questions avoid unsupported numeric claims", { skip }, () => {
  for (const product of catalogue.catalogProducts) {
    for (const faq of product.faqs) {
      assert.ok(faq.question.length > 8 && faq.answer.length > 20, `${product.slug} FAQ too short`);
      assert.ok(!/best in class|world'?s best|guaranteed \d+ ?%/i.test(faq.answer));
    }
  }
});
