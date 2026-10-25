import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminFiles = [
  "components/admin-ai-creatives.tsx",
  "components/admin-events.tsx",
  "components/admin-gallery.tsx",
  "components/admin-hero-banners.tsx",
  "components/admin-products.tsx",
  "components/admin-resources.tsx",
  "components/admin-team-management.tsx",
];

test("admin modules never construct FormData from an event, file, or button", async () => {
  for (const file of adminFiles) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /new\s+FormData\s*\(\s*(?:event|e|file|button)\s*\)/, file);
  }
});

test("gallery captures form data before its first asynchronous upload", async () => {
  const source = await readFile(new URL("../components/admin-gallery.tsx", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf("async function save"), source.indexOf("async function bulk"));
  assert.ok(handler.indexOf("new FormData(event.currentTarget)") >= 0);
  assert.ok(handler.indexOf("new FormData(event.currentTarget)") < handler.indexOf("await upload("));
});
