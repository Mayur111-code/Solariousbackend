import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALL_CREATIVE_CATEGORIES,
  ASPECT_RATIO_IDS,
  FESTIVAL_CATEGORY,
  FESTIVAL_OCCASIONS,
  LANGUAGES,
  PLATFORM_IDS,
  REVIEW_STATUSES,
  normaliseCategory,
} from "../backend/services/creative-catalogue.mjs";

const ui = readFileSync(new URL("../lib/creative-options.ts", import.meta.url), "utf8");

const stringList = name => {
  const match = ui.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`, "m"));
  assert.ok(match, `${name} must exist in lib/creative-options.ts`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1]);
};

// `PLATFORM_IDS`/`ASPECT_RATIO_IDS` are derived from object arrays in the UI file.
const derivedIds = name => {
  const match = ui.match(new RegExp(`export const ${name} = \\[[^\\]]*\\] as const`, "m"));
  assert.ok(match, `${name} array must exist in lib/creative-options.ts`);
  return [...match[0].matchAll(/id: "([^"]+)"/g)].map(item => item[1]);
};

test("the admin UI mirrors the backend creative categories exactly", () => {
  const categories = stringList("CREATIVE_CATEGORIES");
  // The UI builds its full list from the festival entry plus the categories.
  assert.deepEqual([FESTIVAL_CATEGORY, ...categories], [...ALL_CREATIVE_CATEGORIES]);
  assert.equal(stringList("LANGUAGES").length, LANGUAGES.length);
  assert.match(ui, /export const ALL_CREATIVE_CATEGORIES = \[\s*FESTIVAL_CATEGORY,\s*\.\.\.CREATIVE_CATEGORIES,?\s*\]/);
});

test("platforms, ratios and review statuses stay in sync with the API", () => {
  assert.deepEqual(derivedIds("PLATFORMS"), [...PLATFORM_IDS]);
  assert.deepEqual(derivedIds("ASPECT_RATIOS"), [...ASPECT_RATIO_IDS]);
  assert.deepEqual(stringList("REVIEW_STATUSES"), [...REVIEW_STATUSES]);
  assert.equal(FESTIVAL_CATEGORY, "Festival Campaign");
});

test("festival occasions are identical on both sides", () => {
  const uiOccasions = (ui.match(/export const FESTIVAL_OCCASIONS = \[([\s\S]*?)\] as const/) || [])[1] || "";
  const parsed = [...uiOccasions.matchAll(/"([^"]+)"/g)].map(item => item[1]);
  assert.deepEqual(parsed, [...FESTIVAL_OCCASIONS]);
});

test("legacy category names still resolve to a catalogue category", () => {
  for (const legacy of ["Festival", "Electricity Savings", "Awareness", "Product Promo"]) {
    assert.ok(ALL_CREATIVE_CATEGORIES.includes(normaliseCategory(legacy)));
  }
  assert.equal(normaliseCategory("something invented"), "");
  assert.equal(normaliseCategory("commercial-solar"), "Commercial Solar");
});
