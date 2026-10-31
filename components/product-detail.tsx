import Link from "next/link";
import { ArrowRight, CheckCircle2, FileDown, Images } from "lucide-react";
import type { Product } from "@/data/site";
import { products } from "@/data/site";
import InnerPageHero from "@/components/inner-page-hero";
import LeadFormModal from "@/components/lead-form-modal";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import ProductSpecificationView from "@/components/product-specification-view";
import ProductDocuments from "@/components/product-documents";
import ProductGallery from "@/components/product-gallery";

export default function ProductDetail({ product }: { product: Product }) {
  const related = products.filter((item) => item.slug !== product.slug).slice(0, 3);
  const gallery = [product.image, ...(product.gallery ?? [])]
    .filter((source, index, list): source is string => Boolean(source) && list.indexOf(source) === index)
    .slice(0, 4);
  const classification = [
    { label: "Technology", value: product.technology },
    { label: "Construction", value: product.moduleType ?? product.bifacial },
    { label: "Verified power range", value: product.powerRating ?? "Confirm current series" },
    { label: "Verified efficiency range", value: product.efficiency ?? "Confirm current series" },
    { label: "Cell format", value: product.cellType ?? "Confirm current series" },
    { label: "Applications", value: product.applications.join(", ") || "Project dependent" },
  ];

  return (
    <main className="product-detail-page">
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.productDetail}
        eyebrow={`${product.technology}${product.moduleType ? ` / ${product.moduleType}` : ""}`}
        title={`${product.name} Solar Modules`}
        description={product.summary}
        breadcrumb={[{ label: "Products", href: "/products" }, { label: product.name }]}
        image={product.image}
        imageAlt={`${product.name} solar module technology`}
        actions={
          <>
            <LeadFormModal label="Get a quote" />
            <a className="button button-ghost" href="#datasheet-heading">
              <FileDown size={16} aria-hidden="true" /> View datasheets
            </a>
          </>
        }
      />

      <section className="content-section product-overview-section" aria-labelledby="product-overview-heading">
        <div className="detail-columns">
          <article>
            <p className="premium-kicker">Technology overview</p>
            <h2 id="product-overview-heading">Engineered around verified project requirements</h2>
            <p>
              {product.summary} Final selection must use the applicable model, approved datasheet,
              site conditions and engineering review.
            </p>
            {product.features.length ? (
              <ul className="product-feature-list">
                {product.features.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
          <div className="spec-panel">
            <h2>Product classification</h2>
            <dl>
              {classification.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {gallery.length > 1 ? (
        <section className="content-section product-gallery-section" aria-labelledby="product-gallery-heading">
          <div className="product-section-heading">
            <p className="premium-kicker">Product imagery</p>
            <h2 id="product-gallery-heading">
              <Images size={20} aria-hidden="true" /> Module photography
            </h2>
            <p>Manufacturing and installation imagery published by the Solarious team.</p>
          </div>
          <ProductGallery images={gallery} name={product.name} />
        </section>
      ) : null}

      <ProductSpecificationView product={product} />

      <ProductDocuments product={product} />

      <section className="content-section product-detail-cta-section" aria-label="Related module categories">
        <h2 className="related-heading">Related module categories</h2>
        <div className="related-grid">
          {related.map((item) => (
            <Link key={item.slug} href={`/products/${item.slug}`}>
              <span>{item.technology}</span>
              <strong>{item.name}</strong>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="premium-wide-cta">
          <div>
            <p className="premium-kicker">Project-specific guidance</p>
            <h2>Request a confirmed module quotation.</h2>
          </div>
          <Link className="premium-button" href={`/quote?product=${encodeURIComponent(product.slug)}`}>
            Get a quote <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
