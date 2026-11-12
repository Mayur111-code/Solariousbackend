import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Product } from "@/data/site";

/**
 * Homepage product showcase: a responsive card grid in the reference layout.
 * Product names, imagery, technology labels and summaries all come from the
 * existing catalogue (CMS/API backed), so the redesign changes presentation
 * only.
 */
export default function PremiumProductShowcase({
  products,
}: {
  products: Product[];
}) {
  if (!products.length) return null;

  return (
    <>
      <div className="premium-product-showcase" data-reveal-group>
        {products.map((product) => (
          <article className="product-showcase-card" key={product.slug} data-reveal-item>
            <div className="product-showcase-media">
              <Image
                src={product.image || "/utility-solar.webp"}
                alt={`${product.name} solar module application`}
                fill
                sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1240px) 46vw, 600px"
              />
            </div>
            <div className="product-showcase-body">
              <h3>{product.name}</h3>
              <p className="product-showcase-tech">{product.technology}</p>
              <p>{product.summary}</p>
              <Link
                className="product-showcase-link"
                href={`/products/${product.slug}`}
                aria-label={`Learn more about ${product.name} modules`}
              >
                Learn more
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="product-showcase-footer">
        <p>
          Confirm final power, efficiency and warranty values with our technical
          team before specifying a module.
        </p>
        <div className="premium-cta-buttons">
          <Link className="premium-button" href="/products">
            Explore all products <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="premium-text-link" href="/quote">
            Request a quote <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
