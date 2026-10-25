import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeSiteSetting } from "./site-settings.mjs";

test("normalizes the centralized company profile", () => {
  const value = sanitizeSiteSetting("companyProfile", {
    companyName: "Solarious Energy",
    legalName: "Mayureshwar Solar Energy Pvt Ltd",
    description: "Solar manufacturing",
    primaryPhone: "+91 98765 43210",
    generalEmail: "INFO@EXAMPLE.COM",
    websiteUrl: "https://solariousenergy.com",
    social: { linkedin: "https://linkedin.com/company/solarious" },
  });
  assert.equal(value.generalEmail, "info@example.com");
  assert.equal(value.primaryPhone, "+91 98765 43210");
  assert.equal(value.social.facebook, "");
});

test("rejects invalid company contact values", () => {
  assert.throws(() => sanitizeSiteSetting("companyProfile", {
    companyName: "Solarious",
    legalName: "Solarious Pvt Ltd",
    description: "Solar manufacturing",
    generalEmail: "invalid",
  }), /valid email address/);
});

test("sanitizes SEO controls and rejects arbitrary setting keys", () => {
  const value = sanitizeSiteSetting("seoSettings", {
    title: "Solarious Energy",
    description: "Solar modules and project support.",
    canonicalUrl: "https://www.solariousenergy.com",
    ogImage: "/solarious-logo.png",
    robotsIndex: false,
    robotsFollow: true,
  });
  assert.equal(value.robotsIndex, false);
  assert.equal(value.ogImage, "/solarious-logo.png");
  assert.throws(() => sanitizeSiteSetting("adminSecrets", {}), /not editable/);
});
