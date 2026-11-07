import Link from "next/link";
import { Layers } from "lucide-react";

export type CategoryNavItem = {
  slug: string;
  label: string;
  tagline: string;
  count: number;
};

export default function ProductCategoryNav({
  categories,
  active,
}: {
  categories: CategoryNavItem[];
  active?: string;
}) {
  return (
    <nav className="ps-category-nav" aria-label="Product categories">
      <Link
        href="/products"
        className={`ps-category-pill${active ? "" : " is-active"}`}
        aria-current={active ? undefined : "page"}
      >
        <Layers size={16} aria-hidden="true" />
        <span>
          <strong>All modules</strong>
          <small>Full catalogue</small>
        </span>
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/products/${category.slug}`}
          className={`ps-category-pill${active === category.slug ? " is-active" : ""}`}
          aria-current={active === category.slug ? "page" : undefined}
        >
          <span>
            <strong>{category.label}</strong>
            <small>
              {category.count
                ? `${category.count} ${category.count === 1 ? "series" : "series"}`
                : "Specifications on request"}
            </small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
