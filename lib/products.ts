import "server-only";

import {
  PRODUCT_CATEGORIES,
  catalogProduct,
  catalogProducts,
  type CatalogProduct,
  type ProductCategory,
  type ProductCategorySlug,
  type ProductDocument,
  type ProductFaq,
  type ProductVariant,
  type SpecTable,
} from "@/data/product-catalog";
import { backendApiUrl } from "@/lib/server-config";

const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const num = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

const textList = (value: unknown) =>
  stringList(value).map((item) => item.trim()).filter(Boolean);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function normaliseSpecTables(value: unknown): SpecTable[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((table, index) => {
    const columns = stringList(table.columns);
    const rows = Array.isArray(table.rows)
      ? table.rows.filter(isRecord).map((row) => ({
          label: str(row.label, "Specification"),
          values: stringList(row.values).map((item) => item.trim()),
        }))
      : [];
    return {
      id: str(table.id, `table-${index + 1}`),
      title: str(table.title, "Specification"),
      description: str(table.description) || undefined,
      columns,
      rows: rows.filter((row) => row.label && row.values.length > 0),
      note: str(table.note) || undefined,
      matrix: typeof table.matrix === "boolean" ? table.matrix : columns.length > 1,
    };
  });
}

function normaliseVariants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => {
    const power = num(item.power, Number(str(item.label).replace(/[^\d.]/g, "")) || 0);
    return {
      id: str(item.id, String(index)),
      label: str(item.label, power ? `${power} Wp` : `Variant ${index + 1}`),
      power,
      voc: str(item.voc),
      isc: str(item.isc),
      vmp: str(item.vmp),
      imp: str(item.imp),
      efficiency: str(item.efficiency),
      tolerance: str(item.tolerance) || undefined,
    };
  });
}

function normaliseDocuments(value: unknown): ProductDocument[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      title: str(item.title, "Product document"),
      url: str(item.url),
      fileSize: num(item.fileSize) || undefined,
      kind:
        str(item.kind) === "warranty" ||
        str(item.kind) === "certificate" ||
        str(item.kind) === "installation"
          ? (str(item.kind) as ProductDocument["kind"])
          : "datasheet",
    }))
    .filter((item) => /^https?:\/\//i.test(item.url) || item.url.startsWith("/"));
}

function normaliseFaqs(value: unknown): ProductFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      question: str(item.question),
      answer: str(item.answer),
    }))
    .filter((item) => item.question && item.answer);
}

function normaliseGallery(value: unknown): string[] {
  return stringList(value).filter((item) => /^https?:\/\//i.test(item) || item.startsWith("/"));
}

/**
 * Older product records only carry the flat legacy fields. Merge them over the
 * matching seed record so the new layout keeps working for records that have
 * not been re-saved through the new admin editor, and so no field ever renders
 * as `undefined`.
 */
function normaliseProduct(raw: unknown, seed?: CatalogProduct): CatalogProduct | null {
  if (!isRecord(raw)) return null;
  const slug = str(raw.slug).trim().toLowerCase();
  if (!slug) return null;
  const categorySlug = (
    str(raw.category, seed?.category ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  ) as ProductCategorySlug;
  const category = PRODUCT_CATEGORIES.find((item) => item.slug === categorySlug);
  const fallback: CatalogProduct | undefined = seed ?? catalogProduct(slug);
  const images = normaliseGallery(raw.gallery);
  const primaryImage = str(raw.image) || fallback?.image || "/utility-solar.webp";

  return {
    slug,
    name: str(raw.name, fallback?.name ?? slug),
    modelNumber: str(raw.modelNumber, fallback?.modelNumber ?? ""),
    category: category?.slug ?? fallback?.category ?? "mono-perc",
    categoryLabel: category?.label ?? fallback?.categoryLabel ?? "Solar module",
    technology: str(raw.technology, fallback?.technology ?? "Solar module"),
    moduleType: str(raw.moduleType, fallback?.moduleType ?? ""),
    status:
      str(raw.status) === "archived"
        ? "archived"
        : str(raw.status) === "draft"
          ? "draft"
          : "published",
    summary: str(raw.summary, fallback?.summary ?? "Technical configuration available on request."),
    description: str(raw.description, fallback?.description ?? ""),
    image: primaryImage,
    gallery: images.length ? images : [primaryImage],
    applications: stringList(raw.applications).length ? textList(raw.applications) : (fallback?.applications ?? []),
    features: stringList(raw.features).length ? textList(raw.features) : (fallback?.features ?? []),
    highlights: Array.isArray(raw.highlights) && raw.highlights.length
      ? (raw.highlights as unknown[]).filter(isRecord).map((item) => ({
          title: str(item.title),
          description: str(item.description),
        })).filter((item) => item.title)
      : (fallback?.highlights ?? []),
    benefits: Array.isArray(raw.benefits) && raw.benefits.length
      ? (raw.benefits as unknown[]).filter(isRecord).map((item) => ({
          title: str(item.title),
          description: str(item.description),
        })).filter((item) => item.title)
      : (fallback?.benefits ?? []),
    certifications: stringList(raw.certifications).length
      ? textList(raw.certifications)
      : (fallback?.certifications ?? []),
    warranty: isRecord(raw.warranty)
      ? {
          product: str(raw.warranty.product, fallback?.warranty.product ?? ""),
          performance: str(raw.warranty.performance, fallback?.warranty.performance ?? ""),
          note: str(raw.warranty.note) || undefined,
        }
      : str(raw.warranty)
        ? {
            product: str(raw.warranty),
            performance: fallback?.warranty.performance ?? "",
            note: fallback?.warranty.note,
          }
        : (fallback?.warranty ?? { product: "", performance: "" }),
    powerRange: str(raw.powerRange, fallback?.powerRange ?? ""),
    efficiencyRange: str(raw.efficiencyRange, fallback?.efficiencyRange ?? ""),
    keySpecs: Array.isArray(raw.keySpecs) && raw.keySpecs.length
      ? (raw.keySpecs as unknown[]).filter(isRecord).map((item) => ({
          label: str(item.label),
          value: str(item.value),
        })).filter((item) => item.label && item.value)
      : (fallback?.keySpecs ?? []),
    variants: normaliseVariants(raw.variants).length
      ? normaliseVariants(raw.variants)
      : (fallback?.variants ?? []),
    specTables: normaliseSpecTables(raw.specTables).length
      ? normaliseSpecTables(raw.specTables)
      : (fallback?.specTables ?? []),
    documents: normaliseDocuments(raw.documents).length
      ? normaliseDocuments(raw.documents)
      : (fallback?.documents ?? []),
    faqs: normaliseFaqs(raw.faqs).length ? normaliseFaqs(raw.faqs) : (fallback?.faqs ?? []),
    seo: isRecord(raw.seo)
      ? {
          title: str(raw.seo.title) || fallback?.seo.title,
          description: str(raw.seo.description) || fallback?.seo.description,
          keywords: stringList(raw.seo.keywords).length
            ? textList(raw.seo.keywords)
            : fallback?.seo.keywords,
        }
      : (fallback?.seo ?? {}),
    reviewNotes: stringList(raw.reviewNotes).length
      ? textList(raw.reviewNotes)
      : (fallback?.reviewNotes ?? []),
    specsPending:
      typeof raw.specsPending === "boolean" ? raw.specsPending : Boolean(fallback?.specsPending),
    featured: typeof raw.featured === "boolean" ? raw.featured : Boolean(fallback?.featured),
    displayOrder: num(raw.displayOrder, fallback?.displayOrder ?? 0),
  };
}

/**
 * Published catalogue. Reads the backend when it is configured, and falls back
 * to the datasheet-derived seed data (never to an empty page) if the API is
 * unreachable or returns nothing.
 */
export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const backend = backendApiUrl();
  if (backend) {
    try {
      const response = await fetch(`${backend}/api/products?limit=100`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as { products?: unknown[] };
        if (Array.isArray(payload.products) && payload.products.length) {
          const seedBySlug = new Map(catalogProducts.map((item) => [item.slug, item]));
          const seen = new Set<string>();
          const products = payload.products
            .map((item) => normaliseProduct(item, seedBySlug.get(str((item as Record<string, unknown>)?.slug))))
            .filter((item): item is CatalogProduct => Boolean(item))
            .filter((item) => item.status !== "draft" && item.status !== "archived")
            // Legacy deployments seeded one record per category slug. Those are
            // category placeholders, not sellable modules: the category pages
            // replace them and their admin rows stay editable.
            .filter((item) => !PRODUCT_CATEGORIES.some((category) => category.slug === item.slug))
            .filter((item) => {
              if (seen.has(item.slug)) return false;
              seen.add(item.slug);
              return true;
            })
            .sort(
              (a, b) =>
                (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
                a.name.localeCompare(b.name),
            );
          if (products.length) return products;
        }
      }
    } catch (error) {
      console.error("Unable to load live product catalogue", error);
    }
  }
  return catalogProducts
    .filter((item) => item.status !== "draft" && item.status !== "archived")
    .slice()
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
    );
}

export async function getCatalogProduct(slug: string): Promise<CatalogProduct | null> {
  const products = await getCatalogProducts();
  return products.find((item) => item.slug === slug) ?? null;
}

export type CategoryWithProducts = ProductCategory & {
  products: CatalogProduct[];
  minPower: number;
  maxPower: number;
};

export async function getProductCategories(): Promise<CategoryWithProducts[]> {
  const products = await getCatalogProducts();
  return PRODUCT_CATEGORIES.map((category) => {
    const categoryProducts = products.filter((item) => item.category === category.slug);
    const powers = categoryProducts
      .flatMap((item) => item.variants.map((variant) => variant.power))
      .filter((value) => Number.isFinite(value) && value > 0);
    return {
      ...category,
      products: categoryProducts,
      minPower: powers.length ? Math.min(...powers) : 0,
      maxPower: powers.length ? Math.max(...powers) : 0,
    };
  });
}

export async function getCategory(slug: string): Promise<CategoryWithProducts | null> {
  const categories = await getProductCategories();
  return categories.find((item) => item.slug === slug) ?? null;
}

export async function getRelatedProducts(
  product: CatalogProduct,
  limit = 3,
): Promise<CatalogProduct[]> {
  const products = await getCatalogProducts();
  const sameCategory = products.filter(
    (item) => item.slug !== product.slug && item.category === product.category,
  );
  const others = products.filter(
    (item) => item.slug !== product.slug && item.category !== product.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export function wattageBand(product: CatalogProduct): {
  min: number;
  max: number;
} {
  const powers = product.variants
    .map((variant) => variant.power)
    .filter((value) => Number.isFinite(value) && value > 0);
  return {
    min: powers.length ? Math.min(...powers) : 0,
    max: powers.length ? Math.max(...powers) : 0,
  };
}

export { PRODUCT_CATEGORIES };
