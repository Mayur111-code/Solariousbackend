"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/data/site";

const FALLBACK_IMAGE = "/utility-solar.webp";

/**
 * Catalogue card for a solar module category.
 *
 * Only values that exist on the product record are rendered — nothing is
 * invented. Highlights fall back to the published feature list when a
 * specification field has not been entered yet.
 */
export default function ProductCard({ product }: { product: Product }) {
  const [source, setSource] = useState(product.image || FALLBACK_IMAGE);
  const datasheets = product.datasheets ?? [];
  const specs = [
    { label: "Power range", value: product.powerRating },
    {
      label: "Efficiency",
      value: product.efficiency,
    },
    {
      label: "Construction",
      value: product.moduleType ?? (product.bifacial ? product.bifacial : ""),
    },
    { label: "Cell format", value: product.cellType },
  ].filter((item) => Boolean(item.value));

  return (
    <article className="product-card">
      <div className="product-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={`${product.name} solar modules`}
          loading="lazy"
          decoding="async"
          onError={() => setSource(FALLBACK_IMAGE)}
        />
        <span className="product-badge">{product.technology}</span>
      </div>
      <div className="product-body">
        <span className="product-category">{product.name} category</span>
        <h2>{product.name} Modules</h2>
        <p>{product.summary}</p>

        {specs.length ? (
          <dl className="product-specs">
            {specs.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {product.features.length ? (
          <ul className="product-highlights">
            {product.features.slice(0, 3).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}

        <div className="product-actions">
          <Link className="product-cta" href={`/products/${product.slug}`}>
            View details <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link
            className="product-cta-secondary"
            href={`/quote?product=${encodeURIComponent(product.slug)}`}
          >
            Get a quote
          </Link>
          {datasheets.length ? (
            <Link
              className="product-cta-link"
              href={`/products/${product.slug}#datasheet-heading`}
            >
              <FileText size={14} aria-hidden="true" /> {datasheets.length} datasheet
              {datasheets.length === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
