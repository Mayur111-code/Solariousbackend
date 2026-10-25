import type { Metadata } from "next";
import ProductCatalog from "@/components/product-catalog";
import PageShell from "@/components/page-shell";
import { getSiteProducts } from "@/lib/site-products";
export const metadata: Metadata = {
  title: "High-Efficiency Solar Modules",
  description:
    "Explore Solarious Mono PERC, TOPCon, HJT and Bifacial module categories for commercial, industrial and utility projects.",
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const products = await getSiteProducts();
  return (
    <PageShell
      eyebrow="Solar module portfolio"
      title="High-Efficiency Solar Modules"
      intro="Engineered for every project—from commercial rooftops to utility-scale applications."
      image="/utility-solar.webp"
    >
      <section className="content-section">
        <ProductCatalog products={products} />
        <div className="application-band">
          <article>
            <span>Commercial</span>
            <h2>Rooftop Series</h2>
            <p>
              Module categories for space, loading and project-performance
              priorities.
            </p>
          </article>
          <article>
            <span>Utility</span>
            <h2>Ground-Mounted Series</h2>
            <p>
              Product selection aligned with terrain, mounting, albedo and
              energy-yield studies.
            </p>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
