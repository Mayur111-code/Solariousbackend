import Link from "next/link";
import { ArrowRight, CheckCircle2, FileDown } from "lucide-react";
import type { Product } from "@/data/site";
import { products } from "@/data/site";
import InnerPageHero from "@/components/inner-page-hero";
import LeadFormModal from "@/components/lead-form-modal";
import ProductSpecificationView from "@/components/product-specification-view";

export default function ProductDetail({ product }: { product: Product }) {
  const related = products.filter(item => item.slug !== product.slug).slice(0, 3);
  return <main className="product-detail-page">
    <InnerPageHero eyebrow={`${product.technology}${product.moduleType ? ` / ${product.moduleType}` : ""}`} title={`${product.name} Solar Modules`} description={product.summary} breadcrumb={product.name} image={product.image} actions={<><LeadFormModal label="Get a quote"/><a className="button button-ghost" href="#datasheet-heading"><FileDown size={16}/> View datasheets</a></>}/>
    <section className="content-section product-overview-section">
      <div className="detail-columns"><article><p className="eyebrow">Technology overview</p><h2>Engineered around verified project requirements</h2><p>{product.summary} Final selection must use the applicable model, approved datasheet, site conditions and engineering review.</p><ul>{product.features.map(item => <li key={item}><CheckCircle2 size={17}/>{item}</li>)}</ul></article><div className="spec-panel"><h2>Product classification</h2><dl><div><dt>Technology</dt><dd>{product.name}</dd></div><div><dt>Construction</dt><dd>{product.moduleType ?? product.bifacial}</dd></div><div><dt>Verified power range</dt><dd>{product.powerRating ?? "Confirm current series"}</dd></div><div><dt>Verified efficiency range</dt><dd>{product.efficiency ?? "Confirm current series"}</dd></div><div><dt>Cell format</dt><dd>{product.cellType ?? "Confirm current series"}</dd></div><div><dt>Applications</dt><dd>{product.applications.join(", ")}</dd></div></dl></div></div>
      <ProductSpecificationView product={product}/>
      <h2 className="related-heading">Related module categories</h2><div className="related-grid">{related.map(item => <Link key={item.slug} href={`/products/${item.slug}`}><span>{item.technology}</span><strong>{item.name}</strong><ArrowRight size={17}/></Link>)}</div>
      <div className="premium-wide-cta"><div><p className="premium-kicker">Project-specific guidance</p><h2>Request a confirmed module quotation.</h2></div><Link className="premium-button" href={`/quote?product=${encodeURIComponent(product.slug)}`}>Get a quote <ArrowRight size={16}/></Link></div>
    </section>
  </main>;
}
