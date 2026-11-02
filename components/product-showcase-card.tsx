"use client";

/* Remote catalogue imagery is user-supplied and sized by CSS; next/image cannot
   optimise unknown admin hosts without a loader. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Gauge,
  ShieldCheck,
  SunMedium,
} from "lucide-react";
import { useState } from "react";
import type { CatalogProduct } from "@/data/product-catalog";

const FALLBACK_IMAGE = "/utility-solar.webp";

export default function ProductShowcaseCard({
  product,
  categoryLabel,
}: {
  product: CatalogProduct;
  categoryLabel?: string;
}) {
  const [source, setSource] = useState(product.image || FALLBACK_IMAGE);
  const datasheet = product.documents.find((document) => document.kind === "datasheet");
  const href = `/products/${product.category}/${product.slug}`;
  const chips = [
    product.powerRange && { icon: Gauge, value: product.powerRange },
    product.efficiencyRange && { icon: SunMedium, value: product.efficiencyRange },
    product.moduleType && { icon: BadgeCheck, value: product.moduleType },
  ].filter(Boolean) as { icon: typeof Gauge; value: string }[];

  return (
    <article className="ps-card">
      <Link href={href} className="ps-card-media" tabIndex={-1} aria-hidden="true">
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setSource(FALLBACK_IMAGE)}
        />
        <span className="ps-card-category">{categoryLabel ?? product.categoryLabel}</span>
        {product.specsPending ? (
          <span className="ps-card-status">Datasheet pending</span>
        ) : null}
      </Link>

      <div className="ps-card-body">
        <p className="ps-card-tech">{product.technology}</p>
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p className="ps-card-summary">{product.summary}</p>

        {chips.length ? (
          <ul className="ps-card-chips">
            {chips.map((chip) => (
              <li key={chip.value}>
                <chip.icon size={14} aria-hidden="true" />
                {chip.value}
              </li>
            ))}
          </ul>
        ) : null}

        {product.features.length ? (
          <ul className="ps-card-features">
            {product.features.slice(0, 3).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}

        <p className="ps-card-warranty">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{product.warranty.product || "Warranty terms on request"}</span>
        </p>

        <div className="ps-card-actions">
          <Link className="ps-button ps-button-primary" href={href}>
            View details <ArrowRight size={15} aria-hidden="true" />
          </Link>
          {datasheet ? (
            <a
              className="ps-button ps-button-ghost"
              href={datasheet.url}
              download
              aria-label={`Download the ${product.name} datasheet PDF`}
            >
              <Download size={15} aria-hidden="true" /> Datasheet
            </a>
          ) : (
            <Link className="ps-button ps-button-ghost" href={`${href}#enquiry`}>
              Request specs
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
