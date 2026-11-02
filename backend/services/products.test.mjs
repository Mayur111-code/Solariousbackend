import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCT_LIMITS,
  buildPublicProductQuery,
  duplicateProductInput,
  normaliseProductPayload,
  slugifyProductName,
  statusPatch,
} from "./products.mjs";

const validPayload = () => ({
  name: "G2B 575–600 Wp",
  technology: "Dual-side Energy Generation / G2B",
  summary: "Bifacial glass-to-backsheet module for utility-scale arrays.",
  category: "bifacial",
  moduleType: "Bifacial",
  status: "published",
  image: "/utility-solar.webp",
});

test("slugifyProductName produces url-safe slugs", () => {
  assert.equal(slugifyProductName("G2B 575–600 Wp"), "g2b-575-600-wp");
  assert.equal(slugifyProductName("  Mono PERC // 156 "), "mono-perc-156");
  assert.equal(slugifyProductName("!!!"), "");
  assert.equal(slugifyProductName(undefined), "");
});

test("valid payload passes and derives a slug + published flag", () => {
  const result = normaliseProductPayload(validPayload());
  assert.equal(result.ok, true, result.errors.join("; "));
  assert.equal(result.value.slug, "g2b-575-600-wp");
  assert.equal(result.value.published, true);
  assert.equal(result.value.status, "published");
});

test("missing required fields are reported", () => {
  const result = normaliseProductPayload({});
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /slug/i);
  assert.match(result.errors.join(" "), /name/i);
  assert.match(result.errors.join(" "), /technology/i);
  assert.match(result.errors.join(" "), /summary/i);
});

test("partial payload only touches supplied keys", () => {
  const result = normaliseProductPayload({ status: "draft" }, { partial: true });
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.value).sort(), ["published", "status"]);
  assert.equal(result.value.published, false);
});

test("unknown category and status are rejected", () => {
  const result = normaliseProductPayload({ ...validPayload(), category: "thin-film", status: "live" });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Category must be one of/);
  assert.match(result.errors.join(" "), /Status must be one of/);
});

test("module type must be a supported value", () => {
  const result = normaliseProductPayload({ ...validPayload(), moduleType: "Glass" });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Module type/);
});

test("non-http gallery entries are dropped rather than stored", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    gallery: ["/a.webp", "https://cdn.example.com/b.webp", "javascript:alert(1)"],
  });
  assert.deepEqual(result.value.gallery, ["/a.webp", "https://cdn.example.com/b.webp", ""]);
});

test("variants are sanitised and drive the power range", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    variants: [
      { power: 575, voc: "53.25", isc: "13.45", vmp: "45.90", imp: "12.55", efficiency: "20.75" },
      { power: 600, label: "600 Wp" },
      { power: 5000 },
      "not-a-variant",
    ],
  });
  assert.equal(result.value.variants.length, 2);
  assert.equal(result.value.variants[1].label, "600 Wp");
  assert.equal(result.value.powerMin, 575);
  assert.equal(result.value.powerMax, 600);
  assert.match(result.errors.join(" "), /outside the supported/);
});

test("variant cap is enforced", () => {
  const variants = Array.from({ length: PRODUCT_LIMITS.variants + 5 }, (_, index) => ({
    power: 200 + index,
  }));
  const result = normaliseProductPayload({ ...validPayload(), variants });
  assert.equal(result.value.variants.length, PRODUCT_LIMITS.variants);
});

test("spec tables keep labels/columns and drop empty groups", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    specTables: [
      {
        title: "Electrical specification (STC)",
        columns: ["575 Wp", "580 Wp"],
        rows: [{ label: "Maximum power (Pmp)", values: ["575", "580"] }],
      },
      { title: "Empty", rows: [{ label: "", values: ["x"] }] },
    ],
  });
  assert.equal(result.value.specTables.length, 1);
  assert.equal(result.value.specTables[0].id, "electrical-specification-stc");
  assert.equal(result.value.specTables[0].matrix, true);
  assert.deepEqual(result.value.specTables[0].rows[0].values, ["575", "580"]);
});

test("documents require a safe url and a 20 MB ceiling", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    documents: [
      { title: "Datasheet", url: "/datasheets/solarious-g2b-sheet.pdf", fileSize: 5_000_000 },
      { title: "Bad", url: "javascript:alert(1)" },
      { title: "Huge", url: "https://cdn.example.com/x.pdf", fileSize: PRODUCT_LIMITS.documentBytes + 1 },
    ],
  });
  assert.equal(result.value.documents.length, 1);
  assert.match(result.errors.join(" "), /absolute https URL/);
  assert.match(result.errors.join(" "), /20 MB or smaller/);
});

test("faqs, highlights and benefits drop incomplete rows", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    faqs: [
      { question: "Warranty?", answer: "12 years." },
      { question: "No answer", answer: "" },
    ],
    highlights: [{ title: "600 Wp" }, { description: "no title" }],
    benefits: [{ title: "PID free", description: "Low LID" }],
  });
  assert.equal(result.value.faqs.length, 1);
  assert.equal(result.value.highlights.length, 1);
  assert.equal(result.value.highlights[0].title, "600 Wp");
  assert.equal(result.value.benefits.length, 1);
});

test("seo fields are length-capped", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    seo: { title: "x".repeat(200), description: "y".repeat(400), keywords: ["a", "b"] },
  });
  assert.equal(result.value.seo.title.length, 70);
  assert.equal(result.value.seo.description.length, 180);
  assert.deepEqual(result.value.seo.keywords, ["a", "b"]);
});

test("legacy flat fields remain accepted for API compatibility", () => {
  const result = normaliseProductPayload({
    ...validPayload(),
    powerRating: "575-600 Wp",
    efficiency: "20.75%-21.70%",
    dimensions: "2465 x 1134 x 35 mm",
    warranty: "12-year product / 30-year linear",
    datasheetUrl: "/datasheets/solarious-g2b-sheet.pdf",
  });
  assert.equal(result.value.powerRating, "575-600 Wp");
  assert.equal(result.value.dimensions, "2465 x 1134 x 35 mm");
  assert.equal(result.value.warranty, "12-year product / 30-year linear");
  assert.equal(result.value.datasheetUrl, "/datasheets/solarious-g2b-sheet.pdf");
});

test("public query filters by category, power window and search", () => {
  const filter = buildPublicProductQuery({
    category: "bifacial",
    minPower: 500,
    maxPower: 600,
    search: "G2B",
  });
  assert.deepEqual(filter.status.$nin, ["archived", "draft"]);
  assert.equal(filter.published.$ne, false);
  assert.ok(filter.category instanceof RegExp);
  assert.equal(filter.category.source, "^bifacial$");
  assert.equal(filter.$and.length, 2);
  assert.equal(filter.$or.length, 6);
});

test("public query ignores express-style regex injection in search", () => {
  const filter = buildPublicProductQuery({ search: "a.*b(" });
  assert.equal(filter.$or[0].name.source, "a\\.\\*b\\(");
});

test("statusPatch only accepts known statuses", () => {
  assert.deepEqual(statusPatch("published").value, { status: "published", published: true });
  assert.deepEqual(statusPatch("draft").value, { status: "draft", published: false });
  assert.equal(statusPatch("live").ok, false);
});

test("duplicateProductInput resets identity and publishing state", () => {
  const copy = duplicateProductInput(
    {
      _id: "abc",
      id: "abc",
      slug: "g2b-575-600",
      name: "G2B 575–600 Wp",
      status: "published",
      published: true,
      featured: true,
      displayOrder: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { slug: "g2b-575-600-copy" },
  );
  assert.equal(copy.slug, "g2b-575-600-copy");
  assert.match(copy.name, /\(copy\)$/);
  assert.equal(copy.status, "draft");
  assert.equal(copy.published, false);
  assert.equal(copy.featured, false);
  assert.equal(copy.displayOrder, 0);
  assert.equal(copy._id, undefined);
  assert.equal(copy.createdAt, undefined);
});
