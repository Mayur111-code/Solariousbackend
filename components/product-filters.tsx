"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProductShowcaseCard from "@/components/product-showcase-card";
import type { CatalogProduct } from "@/data/product-catalog";

type Band = "all" | "compact" | "mid" | "high" | "utility";

const BANDS: { id: Band; label: string; min: number; max: number }[] = [
  { id: "compact", label: "Up to 450 Wp", min: 0, max: 450 },
  { id: "mid", label: "451 – 500 Wp", min: 451, max: 500 },
  { id: "high", label: "501 – 550 Wp", min: 501, max: 550 },
  { id: "utility", label: "551 Wp and above", min: 551, max: 10000 },
];

const powerWindow = (product: CatalogProduct) => {
  const powers = product.variants.map((variant) => variant.power).filter((power) => power > 0);
  if (!powers.length) return null;
  return { min: Math.min(...powers), max: Math.max(...powers) };
};

export default function ProductFilters({
  products,
  categories,
  initialCategory = "all",
}: {
  products: CatalogProduct[];
  categories: { slug: string; label: string }[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [technology, setTechnology] = useState("all");
  const [band, setBand] = useState<Band>("all");

  const technologies = useMemo(
    () => [...new Set(products.map((product) => product.technology).filter(Boolean))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const window = BANDS.find((entry) => entry.id === band);
    return products.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (technology !== "all" && product.technology !== technology) return false;
      if (window) {
        const powers = powerWindow(product);
        if (!powers) return false;
        if (powers.max < window.min || powers.min > window.max) return false;
      }
      if (!needle) return true;
      return [
        product.name,
        product.technology,
        product.categoryLabel,
        product.summary,
        product.powerRange,
        product.modelNumber,
        ...product.variants.map((variant) => variant.label),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [products, category, technology, band, query]);

  /* On a category page the listing is already scoped, so the category picker
     would only ever produce an empty grid — hide it and exclude it from the
     filter count. */
  const scopedCategory = initialCategory !== "all";
  const activeFilters =
    Number(!scopedCategory && category !== "all") +
    Number(technology !== "all") +
    Number(band !== "all") +
    Number(Boolean(query));
  const reset = () => {
    setQuery("");
    setCategory(initialCategory);
    setTechnology("all");
    setBand("all");
  };

  return (
    <div className="ps-catalogue">
      <div className="ps-filter-panel">
        <div className="ps-filter-heading">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <h2>Filter the catalogue</h2>
          {activeFilters ? (
            <button type="button" className="ps-filter-reset" onClick={reset}>
              <X size={14} aria-hidden="true" /> Clear {activeFilters}
            </button>
          ) : null}
        </div>

        <label className="ps-filter-search">
          <span>Search</span>
          <span className="ps-filter-input">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Module, wattage or model number"
            />
          </span>
        </label>

        <div className={`ps-filter-row${scopedCategory ? " is-single" : ""}`}>
          {scopedCategory ? null : (
            <label>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Technology</span>
            <select value={technology} onChange={(event) => setTechnology(event.target.value)}>
              <option value="all">All technologies</option>
              {technologies.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="ps-band-group">
          <legend>Wattage</legend>
          <div>
            <button
              type="button"
              className={band === "all" ? "is-active" : ""}
              onClick={() => setBand("all")}
              aria-pressed={band === "all"}
            >
              Any
            </button>
            {BANDS.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={band === entry.id ? "is-active" : ""}
                onClick={() => setBand(entry.id)}
                aria-pressed={band === entry.id}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* The count and the cards travel together as one grid child so the
          catalogue is always filters | results — never filters above cards in
          the narrow left column. */}
      <div className="ps-catalogue-results">
        <p className="ps-results-count" role="status">
          Showing <strong>{filtered.length}</strong> of {products.length} published series
        </p>

        {filtered.length ? (
          <div className="ps-card-grid">
            {filtered.map((product) => (
              <ProductShowcaseCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="ps-empty">
            <h3>No modules match these filters</h3>
            <p>Clear a filter, or talk to our engineering team about a project-specific module.</p>
            <button type="button" className="ps-button ps-button-primary" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
