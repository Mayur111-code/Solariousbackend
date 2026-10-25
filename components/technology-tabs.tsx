"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import type { Product } from "@/data/site";

export default function TechnologyTabs({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  const [activeSlug, setActiveSlug] = useState(products[0]?.slug ?? "");
  const active = products.find((product) => product.slug === activeSlug) ?? products[0];
  if (!active) return null;

  return <div className={`technology-experience ${compact ? "compact" : ""}`}>
    <div className="technology-segments" role="tablist" aria-label="Solar technology categories">{products.map((product) => <button key={product.slug} role="tab" aria-selected={product.slug === active.slug} onClick={() => setActiveSlug(product.slug)}>{product.name}</button>)}</div>
    <article className="technology-panel" role="tabpanel" key={active.slug}>
      <div className="technology-panel-copy"><p className="premium-kicker">{active.technology}</p><h2>{active.name} Technology</h2><p>{active.summary} Final suitability depends on confirmed product specifications and site engineering.</p><div className="technology-advantages">{active.features.map((feature) => <span key={feature}><CheckCircle2 size={17} />{feature}</span>)}</div><div className="technology-links"><Link className="premium-button" href={`/products/${active.slug}`}>Related product <ArrowRight size={16} /></Link><Link className="premium-text-link" href="/about#company-documents"><FileText size={16} /> Relevant documents</Link></div></div>
      <div className="technology-panel-image"><Image src={active.image || "/utility-solar.webp"} alt={`${active.name} solar technology`} fill sizes="(max-width: 1050px) 100vw, 32vw" onError={(event) => { event.currentTarget.src = "/utility-solar.webp"; }} /><span>Technology / {active.name}</span></div>
    </article>
  </div>;
}
