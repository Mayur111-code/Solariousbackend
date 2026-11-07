"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Download,
  FileText,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  Table2,
  Thermometer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CatalogProduct } from "@/data/product-catalog";
import ProductImageGallery from "@/components/product-image-gallery";
import ProductSpecExplorer from "@/components/product-spec-explorer";
import ProductDocumentsPanel from "@/components/product-documents-panel";
import ProductEnquiryForm, {
  type EnquiryProductOption,
} from "@/components/product-enquiry-form";
import ProductShowcaseCard from "@/components/product-showcase-card";
import ProductTabNav, { type ProductTab } from "@/components/product-tab-nav";
import { HeroReveal, Reveal } from "@/components/product-motion";

/* Section G icons cycle through the brand accent order. */
const FEATURE_ICONS: LucideIcon[] = [ShieldCheck, Gauge, BadgeCheck, Cpu, Zap, CheckCircle2];

/** Pull the printed cell description out of the mechanical table if present. */
function cellTechnology(product: CatalogProduct): string {
  const fromKeySpecs = product.keySpecs.find((spec) => /cell/i.test(spec.label));
  if (fromKeySpecs) return fromKeySpecs.value;
  for (const table of product.specTables) {
    const row = table.rows.find((entry) => /solar cell|cell type|cells/i.test(entry.label));
    if (row?.values[0]) return row.values[0];
  }
  return "";
}

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

  const cells = cellTechnology(product);
  const powerTolerance =
    product.powerTolerance || product.variants.find((variant) => variant.tolerance)?.tolerance || "";

  const heroCards = [
    { label: "Product warranty", value: product.warranty.product, icon: ShieldCheck },
    {
      label: "Linear performance warranty",
      value: product.warranty.performance,
      icon: BadgeCheck,
    },
    { label: "Power tolerance", value: powerTolerance, icon: Gauge },
  ].filter((entry) => entry.value);

  const techRows = [
    { label: "Technology", value: product.technology },
    { label: "Module type", value: product.moduleType },
    { label: "Cell technology", value: cells },
    { label: "Model family", value: product.modelNumber },
  ].filter((row) => row.value);

  const tabs: ProductTab[] = [
    { id: "overview", label: "Overview", icon: Sparkles },
    ...(product.specTables.length || product.specsPending
      ? [{ id: "specifications", label: "Technical Specs", icon: Table2 } as ProductTab]
      : []),
    ...(product.variants.length
      ? [{ id: "variants", label: "Variants", icon: Layers } as ProductTab]
      : []),
    ...(product.features.length || product.benefits.length
      ? [{ id: "features", label: "Features", icon: Zap } as ProductTab]
      : []),
    ...(product.certifications.length
      ? [{ id: "certifications", label: "Certifications", icon: Award } as ProductTab]
      : []),
    ...(product.documents.length
      ? [{ id: "resources", label: "Resources", icon: FileText } as ProductTab]
      : []),
  ];

  return (
    <main className="ps-page ps-detail">
      {/* A — breadcrumb + B — premium hero ------------------------------- */}
      <div className="ps-band">
        <div className="ps-band-inner">
          <nav className="ps-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link href="/products">Products</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link href={`/products/${product.category}`}>{product.categoryLabel}</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span aria-current="page">{product.name}</span>
          </nav>

          <section className="ps-hero" aria-labelledby="product-heading">
            <HeroReveal className="ps-hero-copy">
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
              </p>

              <p className="ps-hero-summary">{product.summary}</p>

              {product.powerRange ? (
                <div className="ps-hero-wattage">
                  <small>Power range</small>
                  <strong>{product.powerRange}</strong>
                </div>
              ) : null}

              <div className="ps-hero-actions">
                <a className="ps-button ps-button-primary ps-button-lg" href="#enquiry">
                  <Sparkles size={16} aria-hidden="true" /> Request a Quote
                </a>
                {datasheet ? (
                  <a
                    className="ps-button ps-button-ghost ps-button-lg"
                    href={datasheet.url}
                    download
                  >
                    <Download size={16} aria-hidden="true" /> Download Datasheet
                  </a>
                ) : (
                  <a className="ps-button ps-button-ghost ps-button-lg" href="#resources">
                    Datasheet status
                  </a>
                )}
              </div>

              <p className="ps-hero-note">
                <CheckCircle2 size={14} aria-hidden="true" /> Every published value on this page is
                transcribed from the Solarious datasheet. Nothing is estimated.
              </p>
            </HeroReveal>

            <HeroReveal className="ps-hero-media" delay={0.12}>
              <ProductImageGallery images={gallery} name={product.name} />
            </HeroReveal>

            <div className="ps-hero-cards">
              {heroCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <Reveal key={card.label} delay={0.18 + index * 0.08} y={16}>
                    <div className="ps-spec-card">
                      <span aria-hidden="true">
                        <Icon size={19} />
                      </span>
                      <div>
                        <small>{card.label}</small>
                        <strong>{card.value}</strong>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* C — section navigation ------------------------------------------ */}
      <ProductTabNav tabs={tabs} />

      {/* Key specification strip ----------------------------------------- */}
      {product.keySpecs.length ? (
        <section className="ps-key-specs" aria-label="Key specifications">
          {product.keySpecs.map((spec, index) => (
            <Reveal key={spec.label} as="article" delay={index * 0.06} y={14}>
              <small>{spec.label}</small>
              <strong>{spec.value}</strong>
            </Reveal>
          ))}
        </section>
      ) : null}

      {/* D — overview ----------------------------------------------------- */}
      <Reveal as="section" className="ps-section" id="overview" aria-labelledby="overview-heading">
        <div className="ps-overview">
          <div className="ps-overview-copy">
            <p className="ps-kicker">Product overview</p>
            <h2 id="overview-heading">Engineered for higher energy yield</h2>
            <p>{product.description || product.summary}</p>

            {product.highlights.length ? (
              <ul className="ps-overview-highlights">
                {product.highlights.map((highlight) => (
                  <li key={highlight.title}>
                    <span className="ps-icon-box" aria-hidden="true">
                      <Zap size={19} />
                    </span>
                    <div>
                      <strong>{highlight.title}</strong>
                      <span>{highlight.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {product.configurationNotes?.length ? (
              <ul className="ps-chip-row">
                {product.configurationNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="ps-overview-media">
            <Image
              src={product.gallery[1] ?? product.image}
              alt={`${product.name} module`}
              width={900}
              height={620}
              sizes="(max-width: 1080px) 100vw, 46vw"
            />
            {techRows.length ? (
              <dl className="ps-tech-list">
                {techRows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
                {product.specTables.length ? (
                  <div>
                    <dt>Published tables</dt>
                    <dd>
                      {product.specTables.length} datasheet groups
                      {product.variants.length ? ` · ${product.variants.length} power classes` : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>
      </Reveal>

      {/* E — technical specifications ------------------------------------- */}
      <ProductSpecExplorer product={product} id="specifications" />

      {/* F — variants ------------------------------------------------------ */}
      {product.variants.length ? (
        <Reveal
          as="section"
          className="ps-section ps-variants"
          id="variants"
          aria-labelledby="variants-heading"
        >
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
                  <th scope="col">Tolerance</th>
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
                    <td>{variant.tolerance || powerTolerance || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ps-variant-footnote">
            Except Pmax, parameters carry a ±3% tolerance. There is no negative power tolerance in
            nominal power.
          </p>
        </Reveal>
      ) : null}

      {/* G — features & benefits ------------------------------------------ */}
      {product.features.length || product.benefits.length ? (
        <Reveal
          as="section"
          className="ps-section ps-benefits"
          id="features"
          aria-labelledby="features-heading"
        >
          <div className="ps-section-head">
            <p className="ps-kicker">Features &amp; benefits</p>
            <h2 id="features-heading">
              {product.specsPending
                ? "What we can confirm today"
                : "What the datasheet commits to"}
            </h2>
            <p>
              {product.specsPending
                ? "No module-level datasheet has been published for this family yet, so the notes below are technology-level statements confirmed with the Solarious engineering team — not measured module values."
                : "The feature list is printed on the cover page of this module's datasheet. The benefits restate measured values published on the same sheet."}
            </p>
          </div>

          {product.features.length ? (
            <div className="ps-features">
              {product.features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
                return (
                  <article className="ps-feature-tile" key={feature}>
                    <span aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{feature}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {product.configurationNotes?.length ? (
            <ul className="ps-feature-list">
              {product.configurationNotes.map((note) => (
                <li key={note}>
                  <CheckCircle2 size={16} aria-hidden="true" /> {note}
                </li>
              ))}
            </ul>
          ) : null}

          {product.benefits.length ? (
            <>
              <div className="ps-section-head" style={{ marginTop: "clamp(28px, 4vw, 48px)" }}>
                <h3>Benefits of Solarious solar panels</h3>
              </div>
              <div className="ps-benefit-grid">
                {product.benefits.map((benefit) => (
                  <article key={benefit.title}>
                    <span aria-hidden="true">
                      <Sparkles size={18} />
                    </span>
                    <h4>{benefit.title}</h4>
                    <p>{benefit.description}</p>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {product.warranty.note ? (
            <p className="ps-warranty-note">
              <Thermometer size={18} aria-hidden="true" />
              <span>{product.warranty.note}</span>
            </p>
          ) : null}
        </Reveal>
      ) : null}

      {/* H — certifications ------------------------------------------------ */}
      {product.certifications.length ? (
        <Reveal
          as="section"
          className="ps-section"
          id="certifications"
          aria-labelledby="certifications-heading"
        >
          <div className="ps-section-head">
            <p className="ps-kicker">Compliance</p>
            <h2 id="certifications-heading">Certifications</h2>
            <p>
              Standards and management-system approvals printed on this module&apos;s datasheet.
            </p>
          </div>
          <div className="ps-cert-grid">
            {product.certifications.map((certification) => (
              <article className="ps-cert-tile" key={certification}>
                <span aria-hidden="true">
                  <Award size={18} />
                </span>
                <strong>{certification}</strong>
              </article>
            ))}
          </div>
        </Reveal>
      ) : null}

      {/* I — resources ------------------------------------------------------ */}
      <ProductDocumentsPanel documents={product.documents} name={product.name} id="resources" />

      {/* J — related products ------------------------------------------------- */}
      {related.length ? (
        <Reveal
          as="section"
          className="ps-section ps-related"
          id="related"
          aria-labelledby="related-heading"
        >
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
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </Reveal>
      ) : null}

      {/* K — enquiry ---------------------------------------------------------- */}
      <Reveal
        as="section"
        className="ps-section ps-enquiry"
        id="enquiry"
        aria-labelledby="enquiry-heading"
      >
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
      </Reveal>
    </main>
  );
}
