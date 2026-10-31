import assert from "node:assert/strict";
import test from "node:test";
import {
  CERTIFICATION_CATEGORIES,
  certificationStats,
  groupCertifications,
  publicCertification,
  validateCertification,
} from "./certifications.mjs";

const base = () => ({
  code: "bis-14286",
  name: "BIS Registration — IS 14286",
  category: "bis",
  standards: ["IS 14286", "IS/IEC 61730"],
  scope: "Crystalline silicon terrestrial photovoltaic modules",
  auditRelevance: "Required for grid-connected domestic projects.",
  verificationStatus: "verified",
  documentResourceId: "6512a1f4c2b3d4e5f6071829",
  published: true,
});

test("a verified record with a linked document validates", () => {
  const { values, errors } = validateCertification(base());
  assert.deepEqual(errors, {});
  assert.deepEqual(values.standards, ["IS 14286", "IS/IEC 61730"]);
  assert.equal(values.code, "BIS-14286");
});

test("standards accept a comma separated string and de-duplicate", () => {
  const { values, errors } = validateCertification({ ...base(), standards: "IEC 61215, IEC 61730, IEC 61215" });
  assert.deepEqual(errors, {});
  assert.deepEqual(values.standards, ["IEC 61215", "IEC 61730"]);
});

test("invalid category, empty standards and bad status are rejected", () => {
  const { errors } = validateCertification({ ...base(), category: "made-up", standards: [], verificationStatus: "approved" });
  assert.ok(errors.category);
  assert.ok(errors.standards);
  assert.ok(errors.verificationStatus);
});

test("a certificate cannot be marked verified without a supporting document", () => {
  const { errors } = validateCertification({ ...base(), documentResourceId: "" });
  assert.match(errors.verificationStatus, /Link a certificate document/);
});

test("expiry dates must follow the issue date and be real dates", () => {
  const { errors } = validateCertification({ ...base(), issuedAt: "2026-05-01", expiresAt: "2025-05-01" });
  assert.match(errors.expiresAt, /after the issue date/);
  assert.match(validateCertification({ ...base(), issuedAt: "not-a-date" }).errors.issuedAt, /not a valid date/);
});

test("malformed document identifiers are rejected", () => {
  const { errors } = validateCertification({ ...base(), documentResourceId: "../../etc/passwd" });
  assert.ok(errors.documentResourceId);
});

test("the public projection hides unverified certificate numbers and documents", () => {
  const unverified = publicCertification({
    _id: "1",
    name: "IEC 61215",
    category: "iec",
    standards: ["IEC 61215"],
    verificationStatus: "pending",
    certificateNumber: "SECRET-123",
    documentResourceId: "6512a1f4c2b3d4e5f6071829",
  });
  assert.equal(unverified.verified, false);
  assert.equal(unverified.certificateNumber, "");
  assert.equal(unverified.documentUrl, "");

  const verified = publicCertification({
    _id: "2",
    name: "IEC 61215",
    category: "iec",
    standards: ["IEC 61215"],
    verificationStatus: "verified",
    certificateNumber: "IEC-2026-77",
    documentResourceId: "6512a1f4c2b3d4e5f6071829",
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.certificateNumber, "IEC-2026-77");
  assert.equal(verified.documentUrl, "/api/resources/6512a1f4c2b3d4e5f6071829/file");
});

test("a record flagged verified but missing its document is demoted to pending", () => {
  const record = publicCertification({ name: "ALMM", category: "almm", verificationStatus: "verified", documentResourceId: "" });
  assert.equal(record.verified, false);
  assert.equal(record.verificationStatus, "pending");
});

test("grouping follows the published category order and drops empty groups", () => {
  const groups = groupCertifications([
    { name: "ISO 9001", category: "iso", verificationStatus: "verified", documentResourceId: "6512a1f4c2b3d4e5f6071829", standards: ["ISO 9001:2015"] },
    { name: "BIS", category: "bis", verificationStatus: "unverified", standards: ["IS 14286"] },
    { name: "BIS 2", category: "bis", verificationStatus: "pending", standards: ["IS/IEC 61730"], displayOrder: 2 },
  ]);
  assert.deepEqual(groups.map((group) => group.id), ["bis", "iso"]);
  assert.equal(groups[0].records.length, 2);
  assert.equal(CERTIFICATION_CATEGORIES.length, 4);
});

test("stats separate verified, pending and expired records", () => {
  const stats = certificationStats([
    { published: true, verificationStatus: "verified", documentResourceId: "6512a1f4c2b3d4e5f6071829", expiresAt: new Date("2020-01-01") },
    { published: false, verificationStatus: "pending" },
  ]);
  assert.deepEqual(stats, { total: 2, published: 1, verified: 1, pending: 1, expired: 1 });
});
