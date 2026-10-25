"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Download, MessageSquareText } from "lucide-react";
import type { Product } from "@/data/site";

export default function PremiumProductShowcase({ products }: { products: Product[] }) {
  const [activeSlug, setActiveSlug] = useState(products[0]?.slug ?? "");
  const active = products.find((product) => product.slug === activeSlug) ?? products[0];
  if (!active) return null;

  return <div className="premium-product-showcase">
    <div className="premium-product-tabs" role="tablist" aria-label="Solar module categories">
      {products.map((product, index) => <button key={product.slug} type="button" role="tab" aria-selected={product.slug === active.slug} aria-controls="premium-product-panel" className={product.slug === active.slug ? "active" : ""} onClick={() => setActiveSlug(product.slug)}><span>{String(index + 1).padStart(2, "0")}</span>{product.name}</button>)}
    </div>
    <article id="premium-product-panel" className="premium-product-panel" role="tabpanel" key={active.slug}>
      <div className="premium-product-visual"><Image src={active.image || "/utility-solar.webp"} alt={`${active.name} solar module application`} fill sizes="(max-width: 1050px) 100vw, 32vw" onError={(event) => { event.currentTarget.src = "/utility-solar.webp"; }} /><span>{active.technology}</span></div>
      <div className="premium-product-copy"><p className="premium-kicker">Solar module portfolio</p><h3>{active.name}</h3><p>{active.summary}</p><ul>{active.features.slice(0, 3).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><p className="premium-product-applications"><strong>Applications</strong>{active.applications.join(" · ")}</p><div className="premium-product-actions"><Link className="premium-button" href={`/products/${active.slug}`}>Explore product <ArrowUpRight size={16} /></Link><Link className="premium-text-link" href="/about#company-documents"><Download size={16} /> Download brochure</Link><Link className="premium-text-link" href={`/quote?product=${active.slug}`}><MessageSquareText size={16} /> Enquire now</Link></div></div>
    </article>
  </div>;
}
