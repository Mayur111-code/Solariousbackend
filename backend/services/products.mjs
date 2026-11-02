/**
 * Product catalogue rules shared by the public and admin product endpoints.
 *
 * The catalogue has grown from four flat category records into a nested
 * product document (variants, spec tables, documents, FAQs). All shape and
 * size rules live here so the routes stay thin and the rules are unit-tested
 * without a database.
 */

export const PRODUCT_CATEGORY_SLUGS = ["mono-perc", "hjt", "bifacial", "topcon"];
export const PRODUCT_MODULE_TYPES = [
  "Monofacial",
  "Bifacial",
  "Monofacial / Bifacial",
  "Other",
  "",
];
export const PRODUCT_STATUSES = ["draft", "published", "archived"];
export const PRODUCT_DOCUMENT_KINDS = ["datasheet", "warranty", "certificate", "installation"];

export const PRODUCT_LIMITS = {
  gallery: 12,
  highlights: 8,
  benefits: 12,
  keySpecs: 12,
  variants: 40,
  specTables: 10,
  specRows: 80,
  specColumns: 40,
  documents: 10,
  faqs: 20,
  certifications: 24,
  applications: 12,
  features: 20,
  keywords: 20,
  reviewNotes: 20,
  documentBytes: 20 * 1024 * 1024,
};

const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const EMAIL_SAFE_URL = /^(https?:\/\/|\/)[^\s"'<>]+$/i;

export function slugifyProductName(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const text = (value) => (typeof value === "string" ? value.trim() : "");

const clampText = (value, max) => text(value).slice(0, max);

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function textArray(value, { max, length, label, errors }, { required = false } = {}) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    if (required) errors.push(`${label} must be a list.`);
    return [];
  }
  const items = value.map((item) => text(item)).filter(Boolean).slice(0, max);
  const tooLong = items.find((item) => item.length > length);
  if (tooLong) errors.push(`${label} entries must be ${length} characters or fewer.`);
  return items.map((item) => item.slice(0, length));
}

function urlList(value, { max, label, errors }) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`${label} must be a list of image URLs.`);
    return [];
  }
  return value
    .map((item) => text(item))
    .filter(Boolean)
    .slice(0, max)
    .map((item) => (EMAIL_SAFE_URL.test(item) ? item : ""));
}

function labelValueList(value, { max, label, titleMax, descriptionMax, errors, keys = ["title", "description"] }) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`${label} must be a list.`);
    return [];
  }
  const items = [];
  for (const entry of value.slice(0, max)) {
    if (!isRecord(entry)) {
      errors.push(`Each ${label.toLowerCase()} entry must be an object.`);
      continue;
    }
    const title = clampText(entry[keys[0]], titleMax);
    const description = clampText(entry[keys[1]], descriptionMax);
    if (!title) continue;
    items.push({ [keys[0]]: title, [keys[1]]: description });
  }
  return items;
}

function specTables(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("Specification groups must be a list.");
    return [];
  }
  const tables = [];
  for (const table of value.slice(0, PRODUCT_LIMITS.specTables)) {
    if (!isRecord(table)) {
      errors.push("Each specification group must be an object.");
      continue;
    }
    const id = slugifyProductName(table.id || table.title || "specification") || "specification";
    const columns = Array.isArray(table.columns)
      ? table.columns.map((column) => clampText(column, 60)).filter(Boolean).slice(0, PRODUCT_LIMITS.specColumns)
      : [];
    const rows = [];
    for (const row of Array.isArray(table.rows) ? table.rows.slice(0, PRODUCT_LIMITS.specRows) : []) {
      if (!isRecord(row)) continue;
      const label = clampText(row.label, 160);
      if (!label) continue;
      const values = Array.isArray(row.values)
        ? row.values.map((entry) => clampText(entry, 200)).slice(0, Math.max(columns.length, PRODUCT_LIMITS.specColumns))
        : [];
      rows.push({ label, values: values.length ? values : [""] });
    }
    if (!rows.length) continue;
    tables.push({
      id,
      title: clampText(table.title || "Specification", 120),
      description: clampText(table.description, 400),
      columns: columns.length ? columns : ["Value"],
      rows,
      note: clampText(table.note, 400),
      matrix: table.matrix === true || (table.matrix === undefined && columns.length > 1),
    });
  }
  return tables;
}

function variants(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("Variants must be a list.");
    return [];
  }
  const items = [];
  for (const variant of value.slice(0, PRODUCT_LIMITS.variants)) {
    if (!isRecord(variant)) {
      errors.push("Each variant must be an object.");
      continue;
    }
    const power = number(variant.power);
    const label = clampText(variant.label || (power ? `${power} Wp` : ""), 60);
    if (!label) continue;
    if (power && (power < 50 || power > 1000)) {
      errors.push(`Variant power ${power} Wp is outside the supported 50–1000 Wp range.`);
      continue;
    }
    items.push({
      id: clampText(variant.id || String(power || items.length + 1), 40),
      label,
      power,
      voc: clampText(variant.voc, 20),
      isc: clampText(variant.isc, 20),
      vmp: clampText(variant.vmp, 20),
      imp: clampText(variant.imp, 20),
      efficiency: clampText(variant.efficiency, 20),
      tolerance: clampText(variant.tolerance, 40),
    });
  }
  return items;
}

function documents(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("Documents must be a list.");
    return [];
  }
  const items = [];
  for (const document of value.slice(0, PRODUCT_LIMITS.documents)) {
    if (!isRecord(document)) {
      errors.push("Each document must be an object.");
      continue;
    }
    const url = text(document.url);
    if (!url || !EMAIL_SAFE_URL.test(url)) {
      errors.push("Document URLs must be an absolute https URL or a site-relative path.");
      continue;
    }
    const fileSize = number(document.fileSize);
    if (fileSize > PRODUCT_LIMITS.documentBytes) {
      errors.push("Each document must be 20 MB or smaller.");
      continue;
    }
    const kind = PRODUCT_DOCUMENT_KINDS.includes(document.kind) ? document.kind : "datasheet";
    items.push({
      title: clampText(document.title || "Product document", 120),
      url,
      fileSize,
      kind,
      storageId: clampText(document.storageId, 200),
    });
  }
  return items;
}

function faqs(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("FAQs must be a list.");
    return [];
  }
  const items = [];
  for (const faq of value.slice(0, PRODUCT_LIMITS.faqs)) {
    if (!isRecord(faq)) continue;
    const question = clampText(faq.question, 200);
    const answer = clampText(faq.answer, 1200);
    if (!question || !answer) continue;
    items.push({ question, answer });
  }
  return items;
}

function keySpecs(value, errors) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    errors.push("Key specifications must be a list.");
    return [];
  }
  return value
    .slice(0, PRODUCT_LIMITS.keySpecs)
    .filter(isRecord)
    .map((entry) => ({ label: clampText(entry.label, 60), value: clampText(entry.value, 160) }))
    .filter((entry) => entry.label && entry.value);
}

/**
 * Validate and sanitise a product payload.
 *
 * `partial` is used by PATCH-style updates: only the keys present in the
 * payload are returned, and the required-field checks are skipped so a status
 * change never has to resend the whole document.
 */
export function normaliseProductPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!isRecord(body)) return { ok: false, errors: ["A product payload is required."], value: {} };

  const value = {};

  if (body.slug !== undefined) {
    const slug = slugifyProductName(body.slug);
    if (!SLUG_PATTERN.test(slug)) errors.push("A valid product slug is required.");
    value.slug = slug;
  } else if (!partial) {
    const slug = slugifyProductName(body.name);
    if (!SLUG_PATTERN.test(slug)) errors.push("A valid product slug (or product name) is required.");
    value.slug = slug;
  }

  if (body.name !== undefined || !partial) value.name = clampText(body.name, 120);
  if (body.modelNumber !== undefined) value.modelNumber = clampText(body.modelNumber, 80);
  if (body.technology !== undefined || !partial) value.technology = clampText(body.technology, 120);
  if (body.summary !== undefined || !partial) value.summary = clampText(body.summary, 400);
  if (body.description !== undefined) value.description = clampText(body.description, 6000);

  if (body.category !== undefined) {
    const raw = text(body.category).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (raw && !PRODUCT_CATEGORY_SLUGS.includes(raw)) {
      errors.push(`Category must be one of: ${PRODUCT_CATEGORY_SLUGS.join(", ")}.`);
    }
    value.category = raw;
  }

  if (body.moduleType !== undefined) {
    const moduleType = text(body.moduleType);
    if (!PRODUCT_MODULE_TYPES.includes(moduleType)) {
      errors.push(`Module type must be one of: ${PRODUCT_MODULE_TYPES.filter(Boolean).join(", ")}.`);
    }
    value.moduleType = moduleType;
  }

  if (body.status !== undefined) {
    const status = text(body.status).toLowerCase();
    if (!PRODUCT_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${PRODUCT_STATUSES.join(", ")}.`);
    }
    value.status = PRODUCT_STATUSES.includes(status) ? status : "draft";
    value.published = value.status === "published";
  }

  for (const key of ["image", "datasheetUrl", "datasheetStorageId", "imageStorageId", "datasheetName"]) {
    if (body[key] !== undefined) value[key] = clampText(body[key], 400);
  }
  if (body.datasheetSize !== undefined) value.datasheetSize = Math.max(0, number(body.datasheetSize));
  if (body.displayOrder !== undefined) value.displayOrder = Math.max(0, number(body.displayOrder));
  if (body.featured !== undefined) value.featured = body.featured === true;
  if (body.specsPending !== undefined) value.specsPending = body.specsPending === true;

  const gallery = urlList(body.gallery, { max: PRODUCT_LIMITS.gallery, label: "Gallery", errors });
  if (gallery !== undefined) value.gallery = gallery;

  const applications = textArray(body.applications, {
    max: PRODUCT_LIMITS.applications,
    length: 80,
    label: "Applications",
    errors,
  });
  if (applications !== undefined) value.applications = applications;

  const features = textArray(body.features, {
    max: PRODUCT_LIMITS.features,
    length: 200,
    label: "Features",
    errors,
  });
  if (features !== undefined) value.features = features;

  const certifications = textArray(body.certifications, {
    max: PRODUCT_LIMITS.certifications,
    length: 80,
    label: "Certifications",
    errors,
  });
  if (certifications !== undefined) value.certifications = certifications;

  const reviewNotes = textArray(body.reviewNotes, {
    max: PRODUCT_LIMITS.reviewNotes,
    length: 400,
    label: "Review notes",
    errors,
  });
  if (reviewNotes !== undefined) value.reviewNotes = reviewNotes;

  const highlights = labelValueList(body.highlights, {
    max: PRODUCT_LIMITS.highlights,
    label: "Highlights",
    titleMax: 90,
    descriptionMax: 400,
    errors,
  });
  if (highlights !== undefined) value.highlights = highlights;

  const benefits = labelValueList(body.benefits, {
    max: PRODUCT_LIMITS.benefits,
    label: "Benefits",
    titleMax: 90,
    descriptionMax: 400,
    errors,
  });
  if (benefits !== undefined) value.benefits = benefits;

  const specs = keySpecs(body.keySpecs, errors);
  if (specs !== undefined) value.keySpecs = specs;

  const variantList = variants(body.variants, errors);
  if (variantList !== undefined) {
    value.variants = variantList;
    const powers = variantList.map((variant) => variant.power).filter((power) => power > 0);
    value.powerMin = powers.length ? Math.min(...powers) : 0;
    value.powerMax = powers.length ? Math.max(...powers) : 0;
  }

  const tables = specTables(body.specTables, errors);
  if (tables !== undefined) value.specTables = tables;

  const documentList = documents(body.documents, errors);
  if (documentList !== undefined) value.documents = documentList;

  const faqList = faqs(body.faqs, errors);
  if (faqList !== undefined) value.faqs = faqList;

  if (body.warranty !== undefined) {
    // The legacy schema stored `warranty` as a single string; keep accepting
    // that shape so existing records and integrations keep working.
    value.warranty = isRecord(body.warranty)
      ? {
          product: clampText(body.warranty.product, 200),
          performance: clampText(body.warranty.performance, 200),
          note: clampText(body.warranty.note, 400),
        }
      : clampText(body.warranty, 200);
  }

  if (body.seo !== undefined) {
    const seo = isRecord(body.seo) ? body.seo : {};
    value.seo = {
      title: clampText(seo.title, 70),
      description: clampText(seo.description, 180),
      keywords: Array.isArray(seo.keywords)
        ? seo.keywords.map((keyword) => clampText(keyword, 40)).filter(Boolean).slice(0, PRODUCT_LIMITS.keywords)
        : [],
    };
  }

  for (const key of ["powerRange", "efficiencyRange", "cellType", "dimensions", "weight", "bifacial", "powerRating", "efficiency"]) {
    if (body[key] !== undefined && typeof body[key] === "string") value[key] = clampText(body[key], 120);
  }

  if (!partial) {
    if (!value.name || value.name.length < 2) errors.push("Product name is required (2 characters or more).");
    if (!value.technology) errors.push("Technology is required.");
    if (!value.summary || value.summary.length < 5) errors.push("A short summary is required.");
  }

  return { ok: errors.length === 0, errors, value };
}

/** Mongo filter for the public catalogue listing + filters. */
export function buildPublicProductQuery(query = {}) {
  /* Drafts must never leak even if a legacy record still carries
     `published: true`; `$nin` keeps records that predate the status field. */
  const filter = { published: { $ne: false }, status: { $nin: ["archived", "draft"] } };
  const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const category = text(query.category || query.technology);
  const moduleType = text(query.moduleType);
  const search = text(query.search).slice(0, 80);
  if (category) filter.category = new RegExp(`^${escape(category)}$`, "i");
  if (moduleType) filter.moduleType = new RegExp(escape(moduleType), "i");
  const minPower = Number(query.minPower);
  const maxPower = Number(query.maxPower);
  if (Number.isFinite(minPower) || Number.isFinite(maxPower)) {
    filter.$and = [];
    if (Number.isFinite(minPower)) filter.$and.push({ powerMax: { $gte: minPower } });
    if (Number.isFinite(maxPower)) filter.$and.push({ powerMin: { $lte: maxPower } });
    if (!filter.$and.length) delete filter.$and;
  }
  if (text(query.featured) === "true") filter.featured = true;
  if (search) {
    filter.$or = [
      { name: new RegExp(escape(search), "i") },
      { technology: new RegExp(escape(search), "i") },
      { summary: new RegExp(escape(search), "i") },
      { powerRange: new RegExp(escape(search), "i") },
      { modelNumber: new RegExp(escape(search), "i") },
      { "variants.label": new RegExp(escape(search), "i") },
    ];
  }
  return filter;
}

/** Status patch helper used by publish / unpublish / draft / archive actions. */
export function statusPatch(status) {
  const normalised = text(status).toLowerCase();
  if (!PRODUCT_STATUSES.includes(normalised)) {
    return { ok: false, error: `Status must be one of: ${PRODUCT_STATUSES.join(", ")}.` };
  }
  return { ok: true, value: { status: normalised, published: normalised === "published" } };
}

/** Build the payload for "Duplicate": new slug, draft state, documents copied. */
export function duplicateProductInput(product, { slug } = {}) {
  if (!product) throw new Error("A product is required to duplicate it.");
  const base = slugifyProductName(slug || `${product.slug}-copy`) || "product-copy";
  const next = {
    ...product,
    slug: base,
    name: `${text(product.name) || "Product"} (copy)`.slice(0, 120),
    status: "draft",
    published: false,
    featured: false,
    displayOrder: 0,
  };
  delete next._id;
  delete next.id;
  delete next.createdAt;
  delete next.updatedAt;
  delete next.__v;
  return next;
}
