"use client";
import { useMemo, useState } from "react";
import ProductCard from "@/components/product-card";
import type { Product } from "@/data/site";
export default function ProductCatalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState(""),
    [technology, setTechnology] = useState("all"),
    [moduleType, setModuleType] = useState("all");
  const technologies = [
      ...new Set(products.map((item) => item.technology).filter(Boolean)),
    ],
    types = [
      ...new Set(
        products
          .flatMap((item) =>
            String(item.moduleType || item.bifacial || "").split(" / "),
          )
          .filter(Boolean),
      ),
    ];
  const filtered = useMemo(
    () =>
      products.filter(
        (item) =>
          (technology === "all" || item.technology === technology) &&
          (moduleType === "all" ||
            String(item.moduleType || item.bifacial).includes(moduleType)) &&
          `${item.name} ${item.technology} ${item.summary} ${item.powerRating || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [products, query, technology, moduleType],
  );
  return (
    <>
      <div className="product-catalog-filters">
        <label>
          Search products
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, technology or wattage"
          />
        </label>
        <label>
          Technology
          <select
            value={technology}
            onChange={(event) => setTechnology(event.target.value)}
          >
            <option value="all">All technologies</option>
            {technologies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Module type
          <select
            value={moduleType}
            onChange={(event) => setModuleType(event.target.value)}
          >
            <option value="all">All module types</option>
            {types.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="product-grid">
        {filtered.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
      {!filtered.length && (
        <p className="document-empty">No products match these filters.</p>
      )}
    </>
  );
}
