import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CatalogProduct } from "@/data/product-catalog";
import ProductImageGallery from "@/components/product-image-gallery";
import ProductSpecExplorer from "@/components/product-spec-explorer";
import ProductDocumentsPanel from "@/components/product-documents-panel";
import ProductEnquiryForm, {
  type EnquiryProductOption,
} from "@/components/product-enquiry-form";
import ProductShowcaseCard from "@/components/product-showcase-card";

export default function ProductDetailView({
  product,
  related,
  enquiryProducts,
}: {
  product: CatalogProduct;
  related: CatalogProduct[];
  enquiryProducts: EnquiryProductOption[];
}) {
  const datasheet = product.documents.find((document) => document.kind === "datasheet");
  const gallery = [product.image, ...product.gallery].filter(
    (source, index, list) => Boolean(source) && list.indexOf(source) === index,
  );
  const warrantyCards = [
    { label: "Product warranty", value: product.warranty.product },
    { label: "Performance warranty", value: product.warranty.performance },
  ].filter((entry) => entry.value);

  return (
    <main className="ps-detail">
      <nav className="ps-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link href="/products">Products</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <Link href={`/products/${product.category}`}>{product.categoryLabel}</Link>
        <ChevronRight size={13} aria-hidden="true" />
        <span aria-current="page">{product.name}</span>
      </nav>

      {/* A — gallery + module summary ------------------------------------ */}
      <section className="ps-hero" aria-labelledby="product-heading">
        <div className="ps-hero-media">
          <ProductImageGallery images={gallery} name={product.name} />
        </div>

        <div className="ps-hero-copy">
          <div className="ps-hero-chips">
            <span>{product.categoryLabel}</span>
            {product.moduleType ? <span>{product.moduleType}</span> : null}
            {product.specsPending ? <span className="is-warn">Datasheet pending</span> : null}
          </div>

          <h1 id="product-heading">{product.name}</h1>
          <p className="ps-hero-model">
            {product.modelNumber ? (
              <>
                <BadgeCheck size={15} aria-hidden="true" /> Model family {product.modelNumber}
              </>
            ) : null}
            {product.powerRange ? <span>{product.powerRange}</span> : null}
          </p>
          <p className="ps-hero-summary">{product.summary}</p>

          {product.variants.length ? (
            <div className="ps-hero-metrics" aria-label="Key module ratings">
              <div>
                <small>Power classes</small>
                <strong>{product.variants.length}</strong>
              </div>
              <div>
                <small>Efficiency</small>
                <strong>{product.efficiencyRange || "—"}</strong>
              </div>
              <div>
                <small>Technology</small>
                <strong>{product.categoryLabel}</strong>
              </div>
            </div>
          ) : null}

          {warrantyCards.length ? (
            <div className="ps-warranty-row">
              {warrantyCards.map((entry) => (
                <div key={entry.label}>
                  <ShieldCheck size={17} aria-hidden="true" />
                  <span>
                    <small>{entry.label}</small>
                    <strong>{entry.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="ps-hero-actions">
            <a className="ps-button ps-button-primary ps-button-lg" href="#enquiry">
              <Sparkles size={16} aria-hidden="true" /> Request a quotation
            </a>
            {datasheet ? (
              <a className="ps-button ps-button-ghost ps-button-lg" href={datasheet.url} download>
                <Download size={16} aria-hidden="true" /> Download datasheet
              </a>
            ) : (
              <a className="ps-button ps-button-ghost ps-button-lg" href="#documents">
                Datasheet status
              </a>
            )}
          </div>

          <p className="ps-hero-note">
            <CheckCircle2 size={14} aria-hidden="true" /> Every published value on this page is
            transcribed from the Solarious datasheet. Nothing is estimated.
          </p>
        </div>
      </section>

      {/* B — key specification cards ------------------------------------ */}
      {product.keySpecs.length ? (
        <section className="ps-key-specs" aria-label="Key specifications">
          {product.keySpecs.map((spec) => (
            <article key={spec.label}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </article>
          ))}
        </section>
      ) : null}

      {/* C — specification tables with variant switching ---------------- */}
      <ProductSpecExplorer product={product} />

      {/* D — technical benefits ----------------------------------------- */}
      {product.benefits.length || product.features.length ? (
        <section className="ps-section ps-benefits" aria-labelledby="benefits-heading">
          <div className="ps-section-head">
            <p className="ps-kicker">Engineering advantages</p>
            <h2 id="benefits-heading">Why specify the {product.name}</h2>
            <p>
              Configuration details below come from this module&apos;s own datasheet — not from a
              shared marketing block.
            </p>
          </div>
          <div className="ps-benefit-grid">
            {product.benefits.map((benefit) => (
              <article key={benefit.title}>
                <span aria-hidden="true">
                  <Zap size={18} />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
          {product.features.length ? (
            <ul className="ps-feature-list">
              {product.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={16} aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
          ) : null}
          {product.warranty.note ? (
            <p className="ps-warranty-note">{product.warranty.note}</p>
          ) : null}
        </section>
      ) : null}

      {/* E — product variants -------------------------------------------- */}
      {product.variants.length ? (
        <section className="ps-section ps-variants" aria-labelledby="variants-heading">
          <div className="ps-section-head">
            <p className="ps-kicker">Power classes</p>
            <h2 id="variants-heading">Available variants</h2>
            <p>
              Every published power class with its STC electrical values. Ask for a specific class
              in the enquiry form below.
            </p>
          </div>
          <div className="ps-variant-table-wrap">
            <table className="ps-variant-table">
              <caption>{product.name} published power classes</caption>
              <thead>
                <tr>
                  <th scope="col">Power class</th>
                  <th scope="col">Voc (V)</th>
                  <th scope="col">Isc (A)</th>
                  <th scope="col">Vmp (V)</th>
                  <th scope="col">Imp (A)</th>
                  <th scope="col">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id}>
                    <th scope="row">{variant.label}</th>
                    <td>{variant.voc || "—"}</td>
                    <td>{variant.isc || "—"}</td>
                    <td>{variant.vmp || "—"}</td>
                    <td>{variant.imp || "—"}</td>
                    <td>{variant.efficiency ? `${variant.efficiency}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ps-variant-footnote">
            Except Pmax, parameters carry a ±3% tolerance. There is no negative power tolerance in
            nominal power.
          </p>
        </section>
      ) : null}

      {/* F — datasheet & documents --------------------------------------- */}
      <ProductDocumentsPanel documents={product.documents} name={product.name} />

      {/* G — FAQs -------------------------------------------------------- */}
      {product.faqs.length ? (
        <section className="ps-section ps-faqs" aria-labelledby="faq-heading">
          <div className="ps-section-head">
            <p className="ps-kicker">Questions</p>
            <h2 id="faq-heading">Frequently asked</h2>
            <p>Answers reference the published datasheet. Anything project-specific needs an enquiry.</p>
          </div>
          <div className="ps-faq-list">
            {product.faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* H — related products -------------------------------------------- */}
      {related.length ? (
        <section className="ps-section ps-related" aria-labelledby="related-heading">
          <div className="ps-section-head">
            <p className="ps-kicker">Keep exploring</p>
            <h2 id="related-heading">Related modules</h2>
            <p>Compare other published series in the Solarious catalogue.</p>
          </div>
          <div className="ps-card-grid">
            {related.map((item) => (
              <ProductShowcaseCard key={item.slug} product={item} />
            ))}
          </div>
          <Link className="ps-text-link" href={`/products/${product.category}`}>
            <Layers size={15} aria-hidden="true" /> All {product.categoryLabel} modules
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {/* I — enquiry ----------------------------------------------------- */}
      <section className="ps-section ps-enquiry" aria-labelledby="enquiry-heading" id="enquiry">
        <div className="ps-enquiry-intro">
          <p className="ps-kicker">Project enquiry</p>
          <h2 id="enquiry-heading">Request a {product.name} quotation</h2>
          <p>
            Tell us the capacity, site and power class you need. Our team replies with confirmed
            availability, datasheet revision and commercial terms.
          </p>
          <ul>
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> Technical review of your string design
            </li>
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> Datasheet and warranty documentation
            </li>
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> Dispatch timeline for your quantity
            </li>
          </ul>
          <p className="ps-enquiry-alt">
            Prefer a full bill of materials? <Link href="/quote">Use the quotation wizard</Link>.
          </p>
        </div>
        <ProductEnquiryForm products={enquiryProducts} currentSlug={product.slug} />
      </section>
    </main>
  );
}
