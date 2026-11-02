"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  Layers,
  Loader2,
  Pencil,
  Plus,
  PowerOff,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import AdminProductEditor from "@/components/admin-product-editor";
import {
  PRODUCT_CATEGORY_OPTIONS,
  emptyProduct,
  toDraft,
  type AdminProductRecord,
  type ProductStats,
} from "@/components/admin-product-types";

const STATUS_FILTERS = ["all", "published", "draft", "archived"] as const;

const formatUpdated = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const categoryLabel = (slug: string) =>
  PRODUCT_CATEGORY_OPTIONS.find((option) => option.slug === slug)?.label || slug || "Uncategorised";

function Thumbnail({ product }: { product: AdminProductRecord }) {
  const [failed, setFailed] = useState(false);
  if (!product.image || failed) {
    return (
      <div className="admin-product-image-empty">
        <Layers size={20} aria-hidden="true" />
        <span>No image</span>
      </div>
    );
  }
  return (
    <img
      src={product.image}
      alt={`${product.name} thumbnail`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProductRecord[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [category, setCategory] = useState("all");
  const [editor, setEditor] = useState<{ product: AdminProductRecord | null; isNew: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listResponse, statsResponse] = await Promise.all([
        adminFetch("/api/admin/products"),
        adminFetch("/api/admin/products/stats"),
      ]);
      if (!listResponse.ok) throw await apiError(listResponse, "Products could not be loaded");
      const list = (await listResponse.json()) as { products?: Record<string, unknown>[] };
      setProducts((list.products ?? []).map((item) => toDraft(item)));
      if (statsResponse.ok) {
        setStats((await statsResponse.json()) as ProductStats);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Products could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (status !== "all" && product.status !== status) return false;
      if (category !== "all" && product.category !== category) return false;
      if (!needle) return true;
      return `${product.name} ${product.slug} ${product.modelNumber} ${product.technology} ${product.category}`
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, status, category]);

  const refreshStats = async () => {
    try {
      const response = await adminFetch("/api/admin/products/stats");
      if (response.ok) setStats((await response.json()) as ProductStats);
    } catch {
      /* counters are non-critical */
    }
  };

  const applyRecord = (record: AdminProductRecord) => {
    setProducts((current) => {
      const exists = current.some((item) => (record.id && item.id === record.id) || item.slug === record.slug);
      return exists
        ? current.map((item) =>
            (record.id && item.id === record.id) || item.slug === record.slug ? record : item,
          )
        : [...current, record];
    });
    void refreshStats();
  };

  const action = async (product: AdminProductRecord, kind: "publish" | "unpublish" | "archive" | "restore") => {
    if (!product.id) {
      setError("This record has no identifier — refresh the list and retry.");
      return;
    }
    setBusy(product.id);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:
            kind === "publish"
              ? "publish"
              : kind === "restore"
                ? "draft"
                : kind === "archive"
                  ? "archive"
                  : "unpublish",
        }),
      });
      if (!response.ok) throw await apiError(response, "The product status could not be changed");
      const data = (await response.json()) as { product: Record<string, unknown> };
      applyRecord(toDraft(data.product));
      setNotice(
        kind === "publish"
          ? `${product.name} is now live in the public catalogue.`
          : kind === "archive"
            ? `${product.name} was archived and removed from the catalogue.`
            : kind === "restore"
              ? `${product.name} was restored to draft.`
              : `${product.name} was returned to draft.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The product status could not be changed.");
    } finally {
      setBusy("");
    }
  };

  const duplicate = async (product: AdminProductRecord) => {
    if (!product.id) {
      setError("This record has no identifier — refresh the list and retry.");
      return;
    }
    setBusy(product.id);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw await apiError(response, "The product could not be duplicated");
      const data = (await response.json()) as { product: Record<string, unknown> };
      const copy = toDraft(data.product);
      applyRecord(copy);
      setNotice(`${product.name} was duplicated as a draft. Review it before publishing.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The product could not be duplicated.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (product: AdminProductRecord) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setBusy(product.id ?? product.slug);
    setError("");
    setNotice("");
    try {
      const response = product.id
        ? await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" })
        : await adminFetch(`/api/admin/products?slug=${encodeURIComponent(product.slug)}`, {
            method: "DELETE",
          });
      if (!response.ok) throw await apiError(response, "The product could not be deleted");
      setProducts((current) =>
        current.filter((item) => (product.id ? item.id !== product.id : item.slug !== product.slug)),
      );
      void refreshStats();
      setNotice(`${product.name} was deleted.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The product could not be deleted.");
    } finally {
      setBusy("");
    }
  };

  const counters = [
    { label: "Total products", value: stats?.total ?? products.length, tone: "blue" },
    { label: "Published", value: stats?.published ?? 0, tone: "green" },
    { label: "Drafts", value: stats?.draft ?? 0, tone: "orange" },
    { label: "Archived", value: stats?.archived ?? 0, tone: "red" },
  ];

  return (
    <section className="admin-panel admin-product-panel">
      <div className="admin-panel-head">
        <div>
          <h2>Manage products</h2>
          <p>
            Full catalogue control: draft, publish, duplicate and maintain datasheet-backed
            specifications.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setError("");
            setNotice("");
            setEditor({ product: emptyProduct(), isNew: true });
          }}
        >
          <Plus size={16} aria-hidden="true" /> Add product
        </button>
      </div>

      <div className="admin-product-stats">
        {counters.map((counter) => (
          <article key={counter.label} className={`tone-${counter.tone}`}>
            <small>{counter.label}</small>
            <strong>{counter.value}</strong>
          </article>
        ))}
        <article className="admin-product-stats-bars">
          <small>By category</small>
          <ul>
            {PRODUCT_CATEGORY_OPTIONS.map((option) => {
              const count = stats?.categories.find((item) => item.slug === option.slug)?.count ?? 0;
              return (
                <li key={option.slug}>
                  <span>{option.label}</span>
                  <b>{count}</b>
                </li>
              );
            })}
          </ul>
        </article>
      </div>

      {stats?.pendingSpecs ? (
        <div className="admin-notice">
          {stats.pendingSpecs} product{stats.pendingSpecs === 1 ? "" : "s"} still marked as
          &ldquo;specifications pending&rdquo;. Upload the approved datasheet before publishing.
        </div>
      ) : null}
      {notice ? <div className="admin-notice">{notice}</div> : null}
      {error ? (
        <div className="admin-notice admin-notice-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-product-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, slug or model"
            aria-label="Search products"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {PRODUCT_CATEGORY_OPTIONS.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button button-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" aria-hidden="true" /> : null} Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 className="spin" aria-hidden="true" /> Loading products…
        </div>
      ) : filtered.length ? (
        <div className="admin-product-grid">
          {filtered.map((product) => (
            <article className="admin-product-card ds-interactive" key={product.id ?? product.slug}>
              <div className="admin-product-media">
                <Thumbnail key={`${product.slug}-${product.image}`} product={product} />
                <span className={`admin-card-status status-${product.status}`}>{product.status}</span>
              </div>
              <div className="admin-product-body">
                <p className="admin-product-category">
                  <Layers size={13} aria-hidden="true" /> {categoryLabel(product.category)}
                  {product.moduleType ? ` · ${product.moduleType}` : ""}
                </p>
                <h3>{product.name}</h3>
                <p className="admin-product-summary">{product.summary}</p>
                <dl className="admin-product-meta">
                  <div>
                    <dt>Series</dt>
                    <dd>{product.variants.length} power classes</dd>
                  </div>
                  <div>
                    <dt>Spec groups</dt>
                    <dd>{product.specTables.length}</dd>
                  </div>
                  <div>
                    <dt>Documents</dt>
                    <dd>{product.documents.length}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatUpdated(product.updated_at) || "—"}</dd>
                  </div>
                </dl>
                <div className="admin-card-actions">
                  <button
                    className="button button-ghost"
                    onClick={() => setEditor({ product, isNew: false })}
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil size={15} aria-hidden="true" /> Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void duplicate(product)}
                    disabled={busy === product.id}
                    aria-label={`Duplicate ${product.name}`}
                  >
                    <Copy size={15} aria-hidden="true" /> Duplicate
                  </button>
                  {product.status === "published" ? (
                    <button
                      className="button button-ghost"
                      onClick={() => void action(product, "unpublish")}
                      disabled={busy === product.id}
                      aria-label={`Unpublish ${product.name}`}
                    >
                      <PowerOff size={15} aria-hidden="true" /> Unpublish
                    </button>
                  ) : (
                    <button
                      className="button button-ghost"
                      onClick={() => void action(product, "publish")}
                      disabled={busy === product.id}
                      aria-label={`Publish ${product.name}`}
                    >
                      <Send size={15} aria-hidden="true" /> Publish
                    </button>
                  )}
                  {product.status === "archived" ? (
                    <button
                      className="button button-ghost"
                      onClick={() => void action(product, "restore")}
                      disabled={busy === product.id}
                      aria-label={`Restore ${product.name} to draft`}
                    >
                      <ArchiveRestore size={15} aria-hidden="true" /> Restore
                    </button>
                  ) : (
                    <button
                      className="button button-ghost"
                      onClick={() => void action(product, "archive")}
                      disabled={busy === product.id}
                      aria-label={`Archive ${product.name}`}
                    >
                      <Archive size={15} aria-hidden="true" /> Archive
                    </button>
                  )}
                  <a
                    className="button button-ghost"
                    href={`/products/${product.category}/${product.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View ${product.name} on the website`}
                  >
                    <Eye size={15} aria-hidden="true" /> View
                  </a>
                  <button
                    className="icon-button danger"
                    onClick={() => void remove(product)}
                    disabled={busy === (product.id ?? product.slug)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          {products.length
            ? "No products match this search or filter."
            : "No products have been added yet."}
        </div>
      )}

      {editor ? (
        <AdminProductEditor
          initial={editor.product}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onSaved={(record) => {
            applyRecord(record);
            setEditor(null);
            setNotice(
              record.status === "published"
                ? `${record.name} was saved and published.`
                : `${record.name} was saved as a draft.`,
            );
          }}
        />
      ) : null}
    </section>
  );
}
