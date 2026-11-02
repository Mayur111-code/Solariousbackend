/**
 * Admin-side product shape and helpers.
 *
 * The API accepts and returns the nested catalogue document defined in
 * backend/services/products.mjs. These helpers keep the editor free of
 * defensive `?? {}` noise and guarantee a consistent payload.
 */

export type AdminSpecRow = { label: string; values: string[] };

export type AdminSpecTable = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: AdminSpecRow[];
  note: string;
  matrix: boolean;
};

export type AdminVariant = {
  id: string;
  label: string;
  power: number;
  voc: string;
  isc: string;
  vmp: string;
  imp: string;
  efficiency: string;
  tolerance: string;
};

export type AdminDocument = {
  title: string;
  url: string;
  fileSize?: number;
  kind: "datasheet" | "warranty" | "certificate" | "installation";
  storageId?: string;
};

export type AdminHighlight = { title: string; description: string };
export type AdminFaq = { question: string; answer: string };
export type AdminSeo = { title: string; description: string; keywords: string[] };
export type AdminWarranty = { product: string; performance: string; note?: string };

export type AdminProductRecord = {
  id?: string;
  slug: string;
  name: string;
  modelNumber: string;
  category: string;
  technology: string;
  moduleType: string;
  status: "draft" | "published" | "archived";
  published: boolean;
  summary: string;
  description: string;
  image: string;
  imageStorageId: string;
  gallery: string[];
  applications: string[];
  features: string[];
  highlights: AdminHighlight[];
  benefits: AdminHighlight[];
  keySpecs: AdminHighlight[];
  certifications: string[];
  reviewNotes: string[];
  specsPending: boolean;
  variants: AdminVariant[];
  specTables: AdminSpecTable[];
  documents: AdminDocument[];
  faqs: AdminFaq[];
  seo: AdminSeo;
  warranty: AdminWarranty;
  powerRange: string;
  efficiencyRange: string;
  powerTolerance: string;
  configurationNotes: string[];
  featured: boolean;
  displayOrder: number;
  updated_at?: string;
  datasheetUrl?: string;
  datasheetStorageId?: string;
  datasheetName?: string;
  datasheetSize?: number;
};

/* These are the four fixed category routes. The labels are the brand spellings
   used on the public site ("Monocorn" / "Topcorn"); the slugs match the URLs. */
export const PRODUCT_CATEGORY_OPTIONS = [
  { slug: "mono-perc", label: "Monocorn (Mono PERC)" },
  { slug: "hjt", label: "HJT" },
  { slug: "bifacial", label: "Bifacial (G2B)" },
  { slug: "topcon", label: "Topcorn (TOPCon)" },
];

export const MODULE_TYPE_OPTIONS = [
  "Monofacial",
  "Bifacial",
  "Monofacial / Bifacial",
  "Other",
  "",
];

export const DOCUMENT_KIND_OPTIONS: AdminDocument["kind"][] = [
  "datasheet",
  "warranty",
  "certificate",
  "installation",
];

export const slugifyValue = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

const text = (value: unknown) => (typeof value === "string" ? value : "");
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
const recordList = <T,>(value: unknown, map: (entry: Record<string, unknown>) => T): T[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map(map)
    : [];

export function emptyProduct(): AdminProductRecord {
  return {
    slug: "",
    name: "",
    modelNumber: "",
    category: "mono-perc",
    technology: "Passivated Emitter and Rear Cell",
    moduleType: "",
    status: "draft",
    published: false,
    summary: "",
    description: "",
    image: "",
    imageStorageId: "",
    gallery: [],
    applications: [],
    features: [],
    highlights: [],
    benefits: [],
    keySpecs: [],
    certifications: [],
    reviewNotes: [],
    specsPending: false,
    variants: [],
    specTables: [],
    documents: [],
    faqs: [],
    seo: { title: "", description: "", keywords: [] },
    warranty: { product: "", performance: "", note: "" },
    powerRange: "",
    efficiencyRange: "",
    powerTolerance: "",
    configurationNotes: [],
    featured: false,
    displayOrder: 0,
  };
}

export function toDraft(raw: Record<string, unknown> | null | undefined): AdminProductRecord {
  const base = emptyProduct();
  if (!raw) return base;
  const warrantyRaw = raw.warranty;
  const warranty: AdminWarranty =
    warrantyRaw && typeof warrantyRaw === "object" && !Array.isArray(warrantyRaw)
      ? {
          product: text((warrantyRaw as Record<string, unknown>).product),
          performance: text((warrantyRaw as Record<string, unknown>).performance),
          note: text((warrantyRaw as Record<string, unknown>).note),
        }
      : { product: text(warrantyRaw), performance: "", note: "" };
  const seoRaw = (raw.seo ?? {}) as Record<string, unknown>;
  const status =
    raw.status === "published" || raw.status === "archived" || raw.status === "draft"
      ? raw.status
      : raw.published === true
        ? "published"
        : "draft";

  return {
    ...base,
    id: raw.id ? String(raw.id) : undefined,
    slug: text(raw.slug),
    name: text(raw.name),
    modelNumber: text(raw.modelNumber),
    category: text(raw.category) || base.category,
    technology: text(raw.technology) || base.technology,
    moduleType: text(raw.moduleType),
    status,
    published: status === "published",
    summary: text(raw.summary),
    description: text(raw.description),
    image: text(raw.image),
    imageStorageId: text(raw.imageStorageId),
    gallery: list(raw.gallery),
    applications: list(raw.applications),
    features: list(raw.features),
    highlights: recordList(raw.highlights, (entry) => ({
      title: text(entry.title),
      description: text(entry.description),
    })),
    benefits: recordList(raw.benefits, (entry) => ({
      title: text(entry.title),
      description: text(entry.description),
    })),
    keySpecs: recordList(raw.keySpecs, (entry) => ({
      title: text(entry.label),
      description: text(entry.value),
    })),
    certifications: list(raw.certifications),
    reviewNotes: list(raw.reviewNotes),
    specsPending: raw.specsPending === true,
    variants: recordList(raw.variants, (entry) => ({
      id: text(entry.id) || String(entry.power ?? ""),
      label: text(entry.label) || `${Number(entry.power) || ""} Wp`,
      power: Number(entry.power) || 0,
      voc: text(entry.voc),
      isc: text(entry.isc),
      vmp: text(entry.vmp),
      imp: text(entry.imp),
      efficiency: text(entry.efficiency),
      tolerance: text(entry.tolerance),
    })),
    specTables: recordList(raw.specTables, (entry) => ({
      id: text(entry.id),
      title: text(entry.title),
      description: text(entry.description),
      columns: list(entry.columns),
      rows: recordList(entry.rows, (row) => ({
        label: text(row.label),
        values: list(row.values),
      })),
      note: text(entry.note),
      matrix: entry.matrix === true,
    })),
    documents: recordList(raw.documents, (entry) => ({
      title: text(entry.title),
      url: text(entry.url),
      fileSize: Number(entry.fileSize) || undefined,
      kind:
        entry.kind === "warranty" || entry.kind === "certificate" || entry.kind === "installation"
          ? entry.kind
          : "datasheet",
      storageId: text(entry.storageId) || undefined,
    })),
    faqs: recordList(raw.faqs, (entry) => ({
      question: text(entry.question),
      answer: text(entry.answer),
    })),
    seo: {
      title: text(seoRaw.title),
      description: text(seoRaw.description),
      keywords: list(seoRaw.keywords),
    },
    warranty,
    powerRange: text(raw.powerRange),
    efficiencyRange: text(raw.efficiencyRange),
    powerTolerance: text(raw.powerTolerance),
    configurationNotes: list(raw.configurationNotes),
    featured: raw.featured === true,
    displayOrder: Number(raw.displayOrder) || 0,
    updated_at: text(raw.updated_at) || text(raw.updatedAt) || undefined,
    datasheetUrl: text(raw.datasheetUrl) || undefined,
    datasheetStorageId: text(raw.datasheetStorageId) || undefined,
    datasheetName: text(raw.datasheetName) || undefined,
    datasheetSize: Number(raw.datasheetSize) || undefined,
  };
}

/** Payload accepted by POST /api/admin/products and PUT /api/admin/products/:id. */
export function toPayload(draft: AdminProductRecord, overrides: Partial<AdminProductRecord> = {}) {
  const merged = { ...draft, ...overrides };
  const cleanedRows = (table: AdminSpecTable) => ({
    id: slugifyValue(table.id || table.title) || "specification",
    title: table.title.trim() || "Specification",
    description: table.description.trim(),
    columns: table.columns.map((column) => column.trim()).filter(Boolean),
    rows: table.rows
      .map((row) => ({
        label: row.label.trim(),
        values: row.values.map((value) => value.trim()),
      }))
      .filter((row) => row.label),
    note: table.note.trim(),
    matrix: table.matrix,
  });

  return {
    slug: slugifyValue(merged.slug || merged.name),
    name: merged.name.trim(),
    modelNumber: merged.modelNumber.trim(),
    category: merged.category,
    technology: merged.technology.trim(),
    moduleType: merged.moduleType,
    status: merged.status,
    published: merged.status === "published",
    summary: merged.summary.trim(),
    description: merged.description.trim(),
    image: merged.image.trim(),
    imageStorageId: merged.imageStorageId,
    gallery: merged.gallery.map((item) => item.trim()).filter(Boolean),
    applications: merged.applications.map((item) => item.trim()).filter(Boolean),
    features: merged.features.map((item) => item.trim()).filter(Boolean),
    highlights: merged.highlights.filter((entry) => entry.title.trim()),
    benefits: merged.benefits.filter((entry) => entry.title.trim()),
    keySpecs: merged.keySpecs
      .filter((entry) => entry.title.trim())
      .map((entry) => ({ label: entry.title, value: entry.description })),
    certifications: merged.certifications.map((item) => item.trim()).filter(Boolean),
    reviewNotes: merged.reviewNotes.map((item) => item.trim()).filter(Boolean),
    specsPending: merged.specsPending,
    variants: merged.variants
      .filter((variant) => variant.label.trim() || variant.power)
      .map((variant) => ({
        ...variant,
        power: Number(variant.power) || 0,
        id: variant.id || String(variant.power || variant.label),
      })),
    specTables: merged.specTables.map(cleanedRows),
    documents: merged.documents.filter((document) => document.url.trim()),
    faqs: merged.faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
    seo: {
      title: merged.seo.title.trim(),
      description: merged.seo.description.trim(),
      keywords: merged.seo.keywords.map((keyword) => keyword.trim()).filter(Boolean),
    },
    warranty: {
      product: merged.warranty.product.trim(),
      performance: merged.warranty.performance.trim(),
      note: merged.warranty.note?.trim() ?? "",
    },
    powerRange: merged.powerRange.trim(),
    efficiencyRange: merged.efficiencyRange.trim(),
    powerTolerance: merged.powerTolerance.trim(),
    configurationNotes: merged.configurationNotes.map((item) => item.trim()).filter(Boolean),
    featured: merged.featured,
    displayOrder: Number(merged.displayOrder) || 0,
  };
}

export type ProductStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
  pendingSpecs: number;
  categories: { slug: string; count: number }[];
};
