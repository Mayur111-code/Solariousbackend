import type { Metadata } from "next";
import ProductListingView from "@/components/product-listing-view";
import { getCatalogProducts, getProductCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Solar Modules — Mono PERC, TOPCon, HJT & Bifacial",
  description:
    "Explore the Solarious solar module catalogue: Mono PERC, TOPCon, HJT and G2B bifacial series with datasheet-verified STC, thermal, mechanical and packing specifications.",
  alternates: { canonical: "/products" },
};

export default async function Page() {
  const [products, categories] = await Promise.all([
    getCatalogProducts(),
    getProductCategories(),
  ]);

  return <ProductListingView products={products} categories={categories} />;
}
