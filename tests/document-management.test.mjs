import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the legacy Resources page permanently redirects to About documents", async () => {
  const source = await read("app/resources/page.tsx");
  assert.match(source, /permanentRedirect\("\/about#company-documents"\)/);
  assert.doesNotMatch(source, /ResourceBrowser/);
});

test("public navigation no longer links to the legacy Resources page", async () => {
  const sources = await Promise.all([
    read("components/site-header.tsx"),
    read("components/site-footer.tsx"),
    read("app/page.tsx"),
    read("app/sitemap.ts"),
  ]);
  for (const source of sources) assert.doesNotMatch(source, /["'`]\/resources["'`]/);
});

test("About publishes every approved document through the shared viewer", async () => {
  const [about, documents, viewer] = await Promise.all([
    read("app/about/page.tsx"),
    read("components/company-documents-section.tsx"),
    read("components/document-preview-modal.tsx"),
  ]);
  assert.match(about, /CompanyDocumentsSection/);
  assert.match(documents, /Company Documents &amp; Certifications/);
  assert.match(documents, /\/api\/resources\/\$\{item\.id\}\/file/);
  assert.doesNotMatch(documents, /category === "Certificates"\s*\)/);
  assert.match(viewer, /application\/pdf/);
  assert.match(viewer, /Preview is not available for this file type/);
});

test("admin document mutations trigger public cache revalidation", async () => {
  const proxy = await read("app/api/[...path]/route.ts");
  assert.match(proxy, /pathname === "\/api\/admin\/resources"/);
  assert.match(proxy, /revalidatePath\("\/", "layout"\)/);
});
