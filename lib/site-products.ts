import "server-only";
import { products as defaults, type Product } from "@/data/site";
import {
  monoPercDatasheets,
  monoPercSeries,
  monoPercTechnicalSpecifications,
} from "@/data/mono-perc-specifications";
import { backendApiUrl } from "@/lib/server-config";

export async function getSiteProducts(): Promise<Product[]> {
  const normalise = (items: unknown[]): Product[] =>
    items
      .filter((item): item is Product =>
        Boolean(
          item &&
          typeof item === "object" &&
          typeof (item as Product).slug === "string" &&
          typeof (item as Product).name === "string",
        ),
      )
      .map((item) => ({
        ...item,
        applications: Array.isArray(item.applications) ? item.applications : [],
        features: Array.isArray(item.features) ? item.features : [],
        image: item.image || "/utility-solar.webp",
        summary:
          item.summary || "Technical configuration available on request.",
        technology: item.technology || "Solar module",
        ...(item.slug === "mono-perc"
          ? {
              moduleType: "Monofacial / Bifacial",
              powerRating: "385-600 Wp",
              efficiency: "19.64%-21.70%",
              cellType: "M10 Mono PERC half-cut",
              warranty:
                "12-year product / source claims 30-year linear performance",
              series: monoPercSeries,
              datasheets: monoPercDatasheets,
              technicalSpecifications: {
                ...monoPercTechnicalSpecifications,
                ...item.technicalSpecifications,
              },
            }
          : {}),
      }));
  try {
    const backend = backendApiUrl();
    if (backend) {
      const response = await fetch(`${backend}/api/products?limit=100`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const remote = (await response.json()) as { products?: Product[] };
        if (Array.isArray(remote.products)) return normalise(remote.products);
      }
      return normalise(defaults);
    }
    return normalise(defaults);
  } catch (error) {
    console.error("Unable to load product overrides", error);
    return normalise(defaults);
  }
}
