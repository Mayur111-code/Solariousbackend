import type { MetadataRoute } from "next";
import { PRODUCT_CATEGORIES, catalogProducts } from "@/data/product-catalog";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.solariousenergy.com").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/services",
    "/products",
    "/quality",
    "/certifications",
    "/gallery",
    "/sustainability",
    "/solar-calculator",
    "/module-recommender",
    "/compare",
    "/contact",
    "/quote",
    "/privacy-policy",
    "/terms",
  ];

  const categoryRoutes = PRODUCT_CATEGORIES.map((category) => ({
    url: `${base}/products/${category.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const productRoutes = catalogProducts
    .filter((product) => product.status === "published")
    .map((product) => ({
      url: `${base}/products/${product.category}/${product.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  return [
    ...routes.map((url) => ({
      url: `${base}${url}`,
      changeFrequency: "monthly" as const,
      priority: url === "" ? 1 : 0.7,
    })),
    ...categoryRoutes,
    ...productRoutes,
  ];
}
