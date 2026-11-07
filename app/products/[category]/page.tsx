import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductListingView from "@/components/product-listing-view";
import {
  getCatalogProduct,
  getCatalogProducts,
  getCategory,
  getProductCategories,
  resolveCategorySlug,
} from "@/lib/products";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const entry = await getCategory(category);
  if (!entry) return {};
  const title = `${entry.label} Solar Modules — ${entry.tagline}`;
  return {
    title,
    description: entry.description.slice(0, 300),
    alternates: { canonical: `/products/${entry.slug}` },
    openGraph: { title, description: entry.description, images: [entry.image] },
  };
}

export default async function Page({ params }: Params) {
  const { category } = await params;
  const entry = await getCategory(category);

  if (!entry) {
    /* "Monocorn" / "Topcorn" are how the brief spells Mono PERC and TOPCon —
       forward them to the canonical slug instead of a 404. */
    const alias = resolveCategorySlug(category);
    if (alias && alias !== category) redirect(`/products/${alias}`);

    /* A module slug used to live at /products/<slug>; keep those links working
       by forwarding to the new nested URL. */
    const product = await getCatalogProduct(category);
    if (product) redirect(`/products/${product.category}/${product.slug}`);
    notFound();
  }

  const [products, categories] = await Promise.all([
    getCatalogProducts(),
    getProductCategories(),
  ]);

  return (
    <ProductListingView
      products={products}
      categories={categories}
      activeCategory={entry}
    />
  );
}
