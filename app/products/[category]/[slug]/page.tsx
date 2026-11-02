import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductDetailView from "@/components/product-detail-view";
import type { EnquiryProductOption } from "@/components/product-enquiry-form";
import { getCatalogProduct, getCatalogProducts, getRelatedProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product || product.category !== category) return {};
  return {
    title: product.seo.title || `${product.name} Solar Module`,
    description:
      product.seo.description ||
      product.summary.slice(0, 300),
    keywords: product.seo.keywords,
    alternates: { canonical: `/products/${product.category}/${product.slug}` },
    openGraph: {
      title: product.seo.title || product.name,
      description: product.seo.description || product.summary,
      images: [product.image],
    },
  };
}

export default async function Page({ params }: Params) {
  const { category, slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) notFound();
  if (product.category !== category) {
    redirect(`/products/${product.category}/${product.slug}`);
  }

  const [related, all] = await Promise.all([
    getRelatedProducts(product, 3),
    getCatalogProducts(),
  ]);

  const enquiryProducts: EnquiryProductOption[] = all.map((item) => ({
    slug: item.slug,
    name: item.name,
    wattages: item.variants.map((variant) => ({
      value: variant.label,
      label: `${variant.label} · ${variant.efficiency ? `${variant.efficiency}%` : item.categoryLabel}`,
    })),
  }));

  return (
    <ProductDetailView
      product={product}
      related={related}
      enquiryProducts={enquiryProducts}
    />
  );
}
