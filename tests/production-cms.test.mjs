import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("20 MiB datasheets use direct cloud upload and server-side PDF verification", async () => {
  const [server, client] = await Promise.all([
    read("backend/server.mjs"),
    read("components/admin-products.tsx"),
  ]);
  const exactLimit = Buffer.alloc(20 * 1024 * 1024);
  assert.equal(exactLimit.byteLength, 20_971_520);
  assert.match(server, /PRODUCT_DATASHEET_MAX_BYTES=20\*1024\*1024/);
  assert.match(server, /signature!=="%PDF-"/);
  assert.match(server, /datasheetSignatureRateLimit/);
  assert.match(client, /uploadDirectly\(file,\s*signed,\s*setUploadProgress\)/);
  assert.doesNotMatch(client, /upload-datasheet.*body:\s*form/);
});
test("retired Technology route is a permanent redirect and is absent from navigation", async () => {
  const [route, header, sitemap] = await Promise.all([
    read("app/technology/page.tsx"),
    read("components/site-header.tsx"),
    read("app/sitemap.ts"),
  ]);
  assert.match(route, /permanentRedirect\("\/products"\)/);
  assert.doesNotMatch(header, /\["Technology","\/technology"\]/);
  assert.doesNotMatch(sitemap, /\/technology/);
});
test("CMS and public pages share database-backed settings with safe defaults", async () => {
  const [server, about, manufacturing, contact] = await Promise.all([
    read("backend/server.mjs"),
    read("app/about/page.tsx"),
    read("app/manufacturing/page.tsx"),
    read("app/contact/page.tsx"),
  ]);
  assert.match(server, /\/api\/site-settings\/:key/);
  assert.match(server, /\/api\/admin\/locations/);
  assert.match(about, /getAboutCms/);
  assert.match(manufacturing, /getManufacturingCms/);
  assert.match(contact, /getLocations/);
});
test("product fallbacks receive the same datasheet enrichment as database products", async () => {
  const loader = await read("lib/site-products.ts");
  assert.equal(loader.match(/return normalise\(defaults\);/g)?.length, 3);
  assert.match(loader, /item\.slug === "mono-perc"/);
  assert.match(loader, /series: monoPercSeries/);
  assert.match(loader, /datasheets: monoPercDatasheets/);
});
test("resource preview preserves MIME type and About owns document presentation", async () => {
  const [server, about, documents] = await Promise.all([
    read("backend/server.mjs"),
    read("app/about/page.tsx"),
    read("components/company-documents-section.tsx"),
  ]);
  assert.match(server, /Content-Disposition/);
  assert.match(server, /X-Content-Type-Options/);
  assert.match(server, /streamResourceFile/);
  assert.match(about, /CompanyDocumentsSection/);
  assert.match(documents, /Company Documents &amp; Certifications/);
});
test("festival studio uses validated image generation and supported aspect ratios", async () => {
  const [server, studio, provider] = await Promise.all([
    read("backend/server.mjs"),
    read("components/admin-ai-creatives.tsx"),
    read("backend/services/image-generation.mjs"),
  ]);
  for (const ratio of ["1:1", "4:5", "9:16", "16:9"]) {
    assert.ok(provider.includes(`"${ratio}"`));
    assert.ok(studio.includes(`value="${ratio}"`));
  }
  assert.match(server, /renderFestivalCreative/);
  assert.match(server, /validateImageBuffer\(generated\.buffer/);
  assert.match(provider, /api\.stability\.ai\/v2beta\/stable-image\/generate/);
  assert.doesNotMatch(server, /deterministic-fallback/);
  assert.doesNotMatch(server, /FESTIVAL_TEMPLATE_FALLBACK/);
  assert.match(provider, /model: "deterministic-fallback"/);
  assert.match(provider, /FESTIVAL_TEMPLATE_FALLBACK === "true"/);
});

test("admin mutations enforce same-origin CSRF before the trusted backend hop", async () => {
  const proxy = await read("app/api/[...path]/route.ts");
  assert.match(proxy, /isAdminMutation && origin && !trustedOrigins\.has\(origin\)/);
  assert.match(proxy, /Cross-origin admin request denied/);
  assert.match(proxy, /headers\.delete\("origin"\)/);
  assert.match(proxy, /revalidatePath\("\/", "layout"\)/);
});

test("company and SEO settings are centralized and consumed by public pages", async () => {
  const [cms, admin, layout, contact, footer] = await Promise.all([
    read("lib/site-cms.ts"),
    read("components/admin-site-cms.tsx"),
    read("app/layout.tsx"),
    read("app/contact/page.tsx"),
    read("components/site-footer.tsx"),
  ]);
  assert.match(cms, /getCompanyCms/);
  assert.match(admin, /companyProfile/);
  assert.match(admin, /canonicalUrl/);
  assert.match(layout, /robotsIndex/);
  assert.match(contact, /company\.salesEmail/);
  assert.match(footer, /company\.footerDescription/);
});
