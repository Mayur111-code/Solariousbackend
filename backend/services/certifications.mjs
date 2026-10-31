// Certification and bankability records.
// Compliance honesty is enforced here: a certificate number or document link is
// only ever exposed once an administrator marks the record verified.

export const CERTIFICATION_CATEGORIES = Object.freeze([
  { id: "bis", label: "BIS Certification", description: "Bureau of Indian Standards registration for crystalline silicon PV modules." },
  { id: "almm", label: "ALMM Enlistment", description: "Approved List of Models and Manufacturers, Ministry of New and Renewable Energy." },
  { id: "iec", label: "IEC International Standards", description: "Design qualification, safety and environmental test standards." },
  { id: "iso", label: "ISO Management Standards", description: "Quality, environmental and occupational health management systems." },
]);

export const VERIFICATION_STATUSES = Object.freeze(["unverified", "pending", "verified"]);

const CATEGORY_IDS = CERTIFICATION_CATEGORIES.map((category) => category.id);

const clean = (value, max = 200) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const optionalDate = (value, label) => {
  if (value === "" || value === null || value === undefined) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error(`${label} is not a valid date.`), { status: 400, code: "INVALID_CERTIFICATION" });
  return date;
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * Validate an admin certification payload.
 * `standards` accepts an array or a comma separated string.
 */
export function validateCertification(input = {}) {
  const errors = {};
  const standardsInput = Array.isArray(input.standards)
    ? input.standards
    : String(input.standards ?? "").split(",");
  const values = {
    code: clean(input.code, 40).toUpperCase(),
    name: clean(input.name, 160),
    category: clean(input.category, 20).toLowerCase(),
    standards: [...new Set(standardsInput.map((item) => clean(item, 40)).filter(Boolean))].slice(0, 12),
    scope: clean(input.scope, 600),
    auditRelevance: clean(input.auditRelevance, 600),
    certificateNumber: clean(input.certificateNumber, 80),
    documentResourceId: clean(input.documentResourceId, 40),
    verificationStatus: clean(input.verificationStatus, 20).toLowerCase() || "unverified",
    published: input.published !== false,
    displayOrder: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : 0,
  };

  if (!values.name) errors.name = "Enter the certification name.";
  if (!CATEGORY_IDS.includes(values.category)) errors.category = "Select a valid certification category.";
  if (!values.standards.length) errors.standards = "Add at least one applicable standard.";
  if (!VERIFICATION_STATUSES.includes(values.verificationStatus)) errors.verificationStatus = "Select a valid verification status.";
  if (values.documentResourceId && !OBJECT_ID.test(values.documentResourceId))
    errors.documentResourceId = "The linked document identifier is invalid.";

  let issuedAt = null;
  let expiresAt = null;
  try {
    issuedAt = optionalDate(input.issuedAt, "Issue date");
  } catch (error) {
    errors.issuedAt = error.message;
  }
  try {
    expiresAt = optionalDate(input.expiresAt, "Expiry date");
  } catch (error) {
    errors.expiresAt = error.message;
  }
  if (issuedAt && expiresAt && expiresAt < issuedAt) errors.expiresAt = "The expiry date must be after the issue date.";

  // A record can only be verified when a supporting document is actually linked.
  if (values.verificationStatus === "verified" && !values.documentResourceId)
    errors.verificationStatus = "Link a certificate document before marking this certification verified.";

  return { values: { ...values, issuedAt, expiresAt }, errors };
}

/**
 * Public projection. Unverified records are labelled as pending and never expose
 * a certificate number or document link.
 */
export function publicCertification(record) {
  const verified = record.verificationStatus === "verified" && Boolean(record.documentResourceId);
  return {
    id: String(record._id || record.id || ""),
    code: record.code || "",
    name: record.name,
    category: record.category,
    categoryLabel: CERTIFICATION_CATEGORIES.find((category) => category.id === record.category)?.label || record.category,
    standards: Array.isArray(record.standards) ? record.standards : [],
    scope: record.scope || "",
    auditRelevance: record.auditRelevance || "",
    verificationStatus: verified ? "verified" : record.verificationStatus === "verified" ? "pending" : record.verificationStatus,
    verified,
    certificateNumber: verified ? record.certificateNumber || "" : "",
    documentUrl: verified && record.documentResourceId ? `/api/resources/${record.documentResourceId}/file` : "",
    issuedAt: record.issuedAt || null,
    expiresAt: record.expiresAt || null,
    expired: Boolean(record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()),
    displayOrder: Number(record.displayOrder) || 0,
  };
}

/** Group for the public compliance ribbon, preserving the spec's category order. */
export function groupCertifications(records = []) {
  return CERTIFICATION_CATEGORIES.map((category) => ({
    ...category,
    records: records
      .filter((record) => record.category === category.id)
      .map(publicCertification)
      .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)),
  })).filter((group) => group.records.length);
}

/** Admin summary used on the dashboard tiles. */
export function certificationStats(records = []) {
  return {
    total: records.length,
    published: records.filter((record) => record.published !== false).length,
    verified: records.filter((record) => publicCertification(record).verified).length,
    pending: records.filter((record) => record.verificationStatus !== "verified").length,
    expired: records.filter((record) => publicCertification(record).expired).length,
  };
}
