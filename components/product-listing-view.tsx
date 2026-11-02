import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BatteryCharging,
  Building2,
  Factory,
  Gauge,
  Layers,
  ShieldCheck,
  SunMedium,
  Wrench,
} from "lucide-react";
import ProductCategoryNav from "@/components/product-category-nav";
import ProductFilters from "@/components/product-filters";
import type { CatalogProduct, ProductCategory } from "@/data/product-catalog";

export type ListingCategory = ProductCategory & { products: CatalogProduct[] };

const ADVANTAGES = [
  {
    icon: Gauge,
    title: "Datasheet-first specification",
    text: "Every wattage, voltage and load figure on this site is transcribed from a published Solarious datasheet — never estimated.",
  },
  {
    icon: ShieldCheck,
    title: "12-year product cover",
    text: "Published modules carry a 12-year product warranty on materials and workmanship, with a 30-year linear performance statement.",
  },
  {
    icon: Wrench,
    title: "Engineering support",
    text: "String sizing, mounting review and documentation support from the Solarious technical team.",
  },
  {
    icon: Factory,
    title: "Manufactured at MIDC Nardana",
    text: "Modules are produced on the Solarious line in Dhule, Maharashtra, with in-line Hi-Pot testing.",
  },
];

const SEGMENTS = [
  {
    icon: Building2,
    title: "Commercial & industrial",
    text: "Half-cut mono-PERC formats from 385 Wp to 555 Wp for rooftops with mixed shading and layout constraints.",
  },
  {
    icon: BatteryCharging,
    title: "Utility-scale plants",
    text: "1500 V DC architectures up to 600 Wp, with published packing and container loading data.",
  },
  {
    icon: SunMedium,
    title: "High-albedo bifacial sites",
    text: "G2B bifacial modules with 10%, 20% and 30% rear-gain tables for ground-mounted arrays.",
  },
];

export default function ProductListingView({
  products,
  categories,
  activeCategory,
}: {
  products: CatalogProduct[];
  categories: ListingCategory[];
  activeCategory?: ListingCategory;
}) {
  const seriesCount = products.length;
  const powers = products
    .flatMap((product) => product.variants.map((variant) => variant.power))
    .filter((power) => power > 0);
  const minPower = powers.length ? Math.min(...powers) : 0;
  const maxPower = powers.length ? Math.max(...powers) : 0;
  const certifications = [
    ...new Set(products.flatMap((product) => product.certifications)),
  ].slice(0, 9);

  const heading = activeCategory
    ? `${activeCategory.label} solar modules`
    : "Explore Our Solar Solutions";
  const eyebrow = activeCategory
    ? `Product category · ${activeCategory.tagline}`
    : "Solar module portfolio";
  const intro = activeCategory
    ? activeCategory.description
    : "Four module families, one engineering standard. Compare published Mono PERC, TOPCon, HJT and bifacial series — then request a datasheet-backed quotation.";
  const heroImage = activeCategory?.image ?? "/utility-solar.webp";

  return (
    <main className="ps-page">
      {/* ------------------------------- hero ------------------------- */}
      <section className="ps-hero-banner" aria-labelledby="catalogue-heading">
        <div className="ps-hero-banner-copy">
          <p className="ps-kicker">{eyebrow}</p>
          <h1 id="catalogue-heading">{heading}</h1>
          <p className="ps-hero-banner-intro">{intro}</p>

          {activeCategory ? (
            <div className="ps-category-highlights">
              {activeCategory.highlights.map((highlight) => (
                <span key={highlight}>
                  <CheckMark /> {highlight}
                </span>
              ))}
            </div>
          ) : (
            <div className="ps-hero-banner-stats">
              <div>
                <strong>{categories.length}</strong>
                <small>Module families</small>
              </div>
              <div>
                <strong>{seriesCount}</strong>
                <small>Published series</small>
              </div>
              <div>
                <strong>
                  {minPower}–{maxPower} Wp
                </strong>
                <small>Wattage window</small>
              </div>
            </div>
          )}

          <div className="ps-hero-banner-actions">
            <a className="ps-button ps-button-primary ps-button-lg" href="#catalogue">
              Browse the catalogue <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link className="ps-button ps-button-ghost ps-button-lg" href="/quote">
              Request a quote
            </Link>
          </div>
        </div>

        <div className="ps-hero-banner-media">
          <Image
            src={heroImage}
            alt={activeCategory ? `${activeCategory.label} solar modules` : "Solar modules in the field"}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 42vw"
          />
          <div className="ps-hero-badge">
            <BadgeCheck size={18} aria-hidden="true" />
            <span>
              <strong>Datasheet verified</strong>
              <small>All published values traceable to a Solarious PDF</small>
            </span>
          </div>
        </div>
      </section>

      {/* --------------------------- category nav ---------------------- */}
      <div className="ps-category-bar">
        <ProductCategoryNav
          categories={categories.map((category) => ({
            slug: category.slug,
            label: category.label,
            tagline: category.tagline,
            count: category.products.length,
          }))}
          active={activeCategory?.slug}
        />
      </div>

      {/* ---------------------------- catalogue ------------------------ */}
      <section className="ps-section ps-catalogue-section" id="catalogue" aria-labelledby="catalogue-list-heading">
        <div className="ps-section-head">
          <p className="ps-kicker">
            {activeCategory ? `${activeCategory.label} series` : "Module catalogue"}
          </p>
          <h2 id="catalogue-list-heading">
            {activeCategory
              ? `Published ${activeCategory.label} series`
              : "Compare every published module"}
          </h2>
          <p>
            Filter by category, technology and wattage. Open any series for full STC, thermal,
            mechanical, operating and packing tables.
          </p>
        </div>
        <ProductFilters
          products={activeCategory ? activeCategory.products : products}
          categories={categories.map((category) => ({
            slug: category.slug,
            label: category.label,
          }))}
          initialCategory={activeCategory?.slug ?? "all"}
        />
      </section>

      {/* --------------------------- why choose ------------------------ */}
      <section className="ps-section ps-why" aria-labelledby="why-heading">
        <div className="ps-section-head">
          <p className="ps-kicker">Why Solarious</p>
          <h2 id="why-heading">Why choose our modules</h2>
          <p>
            A manufacturing and engineering process built to keep published specifications and
            delivered modules aligned.
          </p>
        </div>
        <div className="ps-why-grid">
          {ADVANTAGES.map((item) => (
            <article key={item.title}>
              <span className="ps-icon-box" aria-hidden="true">
                <item.icon size={20} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --------------------------- advantages ------------------------ */}
      <section className="ps-section ps-segments" aria-labelledby="segments-heading">
        <div className="ps-section-head">
          <p className="ps-kicker">Applications</p>
          <h2 id="segments-heading">Where these modules perform</h2>
          <p>
            Selection always follows a site study. These are the project types the published series
            are designed around.
          </p>
        </div>
        <div className="ps-segment-grid">
          {SEGMENTS.map((item, index) => (
            <article key={item.title}>
              <span className="ps-segment-index" aria-hidden="true">
                0{index + 1}
              </span>
              <item.icon size={22} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------- certifications ---------------------- */}
      {certifications.length ? (
        <section className="ps-cert-band" aria-labelledby="cert-heading">
          <div>
            <p className="ps-kicker">Standards printed on the datasheets</p>
            <h2 id="cert-heading">Certifications &amp; approvals</h2>
            <p>
              Confirm the certificate scope and validity for your project with the Solarious
              quality team.
            </p>
          </div>
          <ul>
            {certifications.map((certification) => (
              <li key={certification}>
                <Award size={15} aria-hidden="true" /> {certification}
              </li>
            ))}
          </ul>
          <Link className="ps-text-link" href="/certifications">
            View certification library <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {/* ------------------------------ CTA ---------------------------- */}
      <section className="ps-cta-band" aria-labelledby="cta-heading">
        <div>
          <p className="ps-kicker">Next step</p>
          <h2 id="cta-heading">Get a datasheet-backed quotation</h2>
          <p>
            Share your capacity, site and preferred technology. We reply with confirmed power
            classes, documentation and dispatch timelines.
          </p>
        </div>
        <div className="ps-cta-actions">
          <Link className="ps-button ps-button-primary ps-button-lg" href="/quote">
            Start a quotation <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="ps-button ps-button-ghost ps-button-lg" href="/contact">
            Talk to engineering
          </Link>
        </div>
      </section>
    </main>
  );
}

function CheckMark() {
  return <Layers size={14} aria-hidden="true" />;
}
