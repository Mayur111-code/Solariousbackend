import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the homepage keeps exactly one consolidated technology experience", async () => {
  const home = await read("app/page.tsx");
  assert.equal((home.match(/Solar technology experience/g) || []).length, 1);
  assert.doesNotMatch(home, /TechnologyTabs/);
  assert.match(home, /PremiumProductShowcase products=\{products\}/);
  assert.match(home, /id="technology-experience-heading"/);
  assert.match(home, /href="\/about#company-documents"/);
});

test("a shared, system-font design system is loaded by the root layout", async () => {
  const [layout, designSystem, premiumHome] = await Promise.all([
    read("app/layout.tsx"),
    read("app/design-system.css"),
    read("app/premium-home.css"),
  ]);
  assert.match(layout, /import "\.\/design-system\.css"/);
  assert.match(designSystem, /--font-sans/);
  assert.match(designSystem, /--font-display/);
  assert.match(designSystem, /--type-h[1-4]/);
  assert.match(designSystem, /focus-visible/);
  assert.match(designSystem, /prefers-reduced-motion: reduce/);
  assert.match(premiumHome, /font-family:var\(--font-display\)/);
});

test("the About Us team is a responsive grid with all published member details", async () => {
  const [team, css] = await Promise.all([
    read("components/team-section.tsx"),
    read("app/team.css"),
  ]);
  assert.match(team, /members\.map/);
  assert.match(team, /initialMembers/);
  assert.match(team, /className="team-grid"/);
  assert.match(team, /member\.short_info/);
  assert.match(team, /member\.linkedin_url/);
  assert.match(team, /Portrait placeholder for/);
  assert.doesNotMatch(team, /setInterval|aria-roledescription="carousel"/);
  assert.match(css, /grid-template-columns: repeat\(auto-fit/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("public document cards preview only; admin cards keep thumbnails, metadata and downloads", async () => {
  const [documents, viewer, admin, css, server, helper] = await Promise.all([
    read("components/company-documents-section.tsx"),
    read("components/document-preview-modal.tsx"),
    read("components/admin-resources.tsx"),
    read("app/document-gallery.css"),
    read("backend/server.mjs"),
    read("backend/services/resource-delivery.mjs"),
  ]);
  assert.match(documents, /Company Documents &amp; Certifications/);
  assert.match(documents, /initialResources/);
  assert.match(documents, /\/api\/resources\/\$\{item\.id\}\/file/);
  // About Us reference documents are preview-only: no download affordance and
  // no direct download URL may be rendered in the public gallery.
  assert.doesNotMatch(documents, /download=\{/);
  assert.doesNotMatch(documents, /<Download\b/);
  assert.match(documents, /allowDownload=\{false\}/);
  assert.match(documents, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(documents, /item\.issueDate/);
  assert.match(documents, /item\.issuingOrganization/);
  assert.match(documents, /className="doc-thumb/);
  assert.match(viewer, /download=\{document\.fileName\}/);
  assert.match(viewer, /allowDownload\?: boolean/);
  assert.match(viewer, /allowDownload \? document\.downloadUrl/);
  assert.match(viewer, /rel="noopener noreferrer"/);
  assert.match(viewer, /aria-modal="true"/);
  assert.match(admin, /admin-resource-thumb-cell/);
  assert.match(admin, /admin-resource-thumbnail-editor/);
  assert.match(admin, /download=\{x\.file_name\}/);
  assert.match(css, /aspect-ratio: 16 \/ 10/);
  assert.match(css, /object-fit: contain/);
  assert.match(server, /resolveResourceSource/);
  assert.match(server, /deliverLocalResourceFile/);
  assert.match(helper, /local:/);
});

test("admin project/product and gallery cards keep CRUD metadata and endpoints", async () => {
  const [products, gallery, css] = await Promise.all([
    read("components/admin-products.tsx"),
    read("components/admin-gallery.tsx"),
    read("app/admin-cards.css"),
  ]);
  assert.match(products, /admin-product-card/);
  assert.match(products, /admin-card-status/);
  assert.match(products, /admin-product-meta/);
  assert.match(products, /\/api\/admin\/products/);
  assert.match(gallery, /admin-gallery-media/);
  assert.match(gallery, /admin-gallery-meta/);
  assert.match(gallery, /admin-card-status/);
  assert.match(gallery, /\/api\/admin\/gallery/);
  assert.match(css, /\.admin-card-status/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("WhatsApp uses the supplied international number and accessible external links", async () => {
  const [contact, component, floating, footer, contactPage, quote, home] = await Promise.all([
    read("lib/contact.ts"),
    read("components/whatsapp-contact.tsx"),
    read("components/floating-assistant.tsx"),
    read("components/site-footer.tsx"),
    read("app/contact/page.tsx"),
    read("app/quote/page.tsx"),
    read("app/page.tsx"),
  ]);
  assert.match(contact, /WHATSAPP_NUMBER = "919664379011"/);
  assert.match(contact, /https:\/\/wa\.me\//);
  assert.match(contact, /WHATSAPP_DISPLAY_NUMBER = "\+91 96643 79011"/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(component, /aria-label/);
  assert.match(floating, /WhatsAppLink/);
  assert.doesNotMatch(floating, /wa\.me\/\?text/);
  assert.match(footer, /WhatsAppLink/);
  assert.match(contactPage, /WhatsAppLink/);
  assert.match(quote, /WhatsAppLink/);
  assert.match(home, /WhatsAppLink/);
});

test("the existing hero carousel and consultation CTA are improved, not duplicated", async () => {
  const [hero, home, premiumHome] = await Promise.all([
    read("components/hero-slider.tsx"),
    read("app/page.tsx"),
    read("app/premium-home.css"),
  ]);
  assert.match(hero, /aria-roledescription="carousel"/);
  assert.match(hero, /prefers-reduced-motion/);
  assert.match(hero, /visibilityState/);
  assert.match(hero, /onTouchEnd/);
  assert.match(hero, /ArrowRight/);
  assert.match(hero, /href="\/quote"/);
  assert.match(home, /premium-contact-cta/);
  assert.match(home, /href="\/quote">Full quote form/);
  assert.match(home, /LeadFormModal label="Get a Free Consultation"/);
  assert.match(home, /premium-whatsapp-link/);
  assert.match(premiumHome, /utility-solar\.webp/);
  assert.match(premiumHome, /prefers-reduced-motion:reduce/);
});

test("contact and Get Quote required markers stay on one inline label line", async () => {
  const [contact, quote, fixes, popupCss] = await Promise.all([
    read("components/contact-form.tsx"),
    read("components/quote-popup-form.tsx"),
    read("app/form-fixes.css"),
    read("app/quote-popup.css"),
  ]);
  for (const label of ["Full name", "Company name", "Email address", "Phone number", "Project location", "Message"]) {
    assert.match(contact, new RegExp(`<RequiredLabel>${label}</RequiredLabel>`));
  }
  for (const label of ["Full name", "Mobile number", "Email address", "Enquiry type", "City / location"]) {
    assert.match(quote, new RegExp(`<RequiredLabel>${label}</RequiredLabel>`));
  }
  assert.match(contact, /className="inline-field-label"/);
  assert.match(quote, /className="inline-field-label"/);
  assert.match(fixes, /\.lead-form \.inline-field-label,\s*\.quote-popup-fields \.inline-field-label\s*\{[^}]*display: inline-flex;[^}]*white-space: nowrap;/s);
  assert.match(popupCss, /\.quote-popup-fields \.required-mark\s*\{\s*color: #dc2626;/);
  assert.match(contact, /name="name" required/);
  assert.match(contact, /name="company" required/);
  assert.match(contact, /name="email" required/);
  assert.match(contact, /name="phone" required/);
  assert.match(quote, /name="name" required/);
  assert.match(quote, /name="email"[^>]*required/);
});
