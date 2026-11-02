"use client";

/**
 * Category management for /admin/products.
 *
 * The four category slugs are route segments (/products/mono-perc …), so they
 * are fixed and cannot be created or deleted here. Everything an editor would
 * want to change — the display label, tagline, blurb, hero image, technology
 * line and highlight bullets — is an override stored by the backend. Clearing
 * an override restores the code default shipped in `data/product-catalog.ts`.
 */

import { useCallback, useState } from "react";
import { ChevronDown, Layers, RotateCcw, Save } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { PRODUCT_CATEGORY_OPTIONS } from "@/components/admin-product-types";

export type AdminCategory = {
  slug: string;
  label: string;
  tagline: string;
  description: string;
  technology: string;
  image: string;
  accent: string;
  highlights: string[];
  published: boolean;
  displayOrder: number;
  overridden: boolean;
};

const EMPTY: AdminCategory = {
  slug: "",
  label: "",
  tagline: "",
  description: "",
  technology: "",
  image: "",
  accent: "",
  highlights: [],
  published: true,
  displayOrder: 0,
  overridden: false,
};

const linesToArray = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export default function AdminCategoryManager() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/admin/categories");
      const payload = (await response.json()) as { categories?: AdminCategory[] };
      setRows(
        (payload.categories ?? []).map((entry) => ({
          ...EMPTY,
          ...entry,
          slug: entry.slug,
          highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
        })),
      );
    } catch {
      setError("Category content could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Fetched when the panel is opened rather than from an effect, which keeps
     the network call in an event handler and avoids a cascade of renders. */
  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  const update = (slug: string, patch: Partial<AdminCategory>) =>
    setRows((current) =>
      current.map((row) => (row.slug === slug ? { ...row, ...patch } : row)),
    );

  async function save(row: AdminCategory) {
    setSaving(row.slug);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: row.slug,
          label: row.label,
          tagline: row.tagline,
          description: row.description,
          technology: row.technology,
          image: row.image,
          accent: row.accent,
          highlights: row.highlights,
          published: row.published,
          displayOrder: row.displayOrder,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; errors?: string[] };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? payload.errors?.[0] ?? "The category could not be saved.");
        return;
      }
      setNotice(`${labelFor(row.slug)} category content saved.`);
      await load();
    } catch {
      setError("The category could not be saved.");
    } finally {
      setSaving("");
    }
  }

  async function reset(row: AdminCategory) {
    setSaving(row.slug);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch(
        `/api/admin/categories?slug=${encodeURIComponent(row.slug)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError("The override could not be cleared.");
        return;
      }
      setNotice(`${labelFor(row.slug)} reset to the built-in default.`);
      await load();
    } catch {
      setError("The override could not be cleared.");
    } finally {
      setSaving("");
    }
  }

  const labelFor = (slug: string) =>
    PRODUCT_CATEGORY_OPTIONS.find((option) => option.slug === slug)?.label ?? slug;

  return (
    <div className="admin-category-manager">
      <button
        type="button"
        className="button button-ghost admin-category-toggle"
        onClick={() => void toggleOpen()}
        aria-expanded={open}
      >
        <Layers size={16} aria-hidden="true" />
        Manage categories
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={open ? "is-open" : undefined}
        />
      </button>

      {open ? (
        <div className="admin-category-body">
          <p className="admin-category-hint">
            The four category URLs are fixed by the brand, so categories cannot be added or
            removed — but the label, tagline, blurb, hero image and highlight bullets shown on
            each category page are editable. Leave a field empty to fall back to the built-in
            default.
          </p>

          {loading ? <div className="admin-notice">Loading categories…</div> : null}
          {notice ? <div className="admin-notice">{notice}</div> : null}
          {error ? (
            <div className="admin-notice admin-notice-error" role="alert">
              {error}
            </div>
          ) : null}

          {rows.map((row) => {
            const isOpen = expanded === row.slug;
            return (
              <article className="admin-category-card" key={row.slug}>
                <header>
                  <div>
                    <strong>{labelFor(row.slug)}</strong>
                    <small>
                      /products/{row.slug}
                      {row.overridden ? " · override saved" : " · using default content"}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setExpanded(isOpen ? null : row.slug)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? "Close" : "Edit"}
                  </button>
                </header>

                {isOpen ? (
                  <div className="admin-form-grid">
                    <label>
                      Display label
                      <input
                        value={row.label}
                        maxLength={60}
                        placeholder={labelFor(row.slug)}
                        onChange={(event) => update(row.slug, { label: event.target.value })}
                      />
                    </label>
                    <label>
                      Tagline
                      <input
                        value={row.tagline}
                        maxLength={120}
                        onChange={(event) => update(row.slug, { tagline: event.target.value })}
                      />
                    </label>
                    <label className="is-full">
                      Technology line
                      <input
                        value={row.technology}
                        maxLength={120}
                        onChange={(event) => update(row.slug, { technology: event.target.value })}
                      />
                    </label>
                    <label className="is-full">
                      Description
                      <textarea
                        rows={3}
                        value={row.description}
                        maxLength={2000}
                        onChange={(event) => update(row.slug, { description: event.target.value })}
                      />
                    </label>
                    <label>
                      Hero image URL
                      <input
                        value={row.image}
                        placeholder="/utility-solar.webp"
                        onChange={(event) => update(row.slug, { image: event.target.value })}
                      />
                    </label>
                    <label>
                      Accent
                      <select
                        value={row.accent}
                        onChange={(event) => update(row.slug, { accent: event.target.value })}
                      >
                        <option value="">Default</option>
                        <option value="amber">Amber</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="violet">Violet</option>
                      </select>
                    </label>
                    <label className="is-full">
                      Highlights (one per line)
                      <textarea
                        rows={4}
                        value={row.highlights.join("\n")}
                        onChange={(event) =>
                          update(row.slug, { highlights: linesToArray(event.target.value) })
                        }
                      />
                    </label>
                    <label className="admin-inline-toggle is-full">
                      <input
                        type="checkbox"
                        checked={row.published}
                        onChange={(event) => update(row.slug, { published: event.target.checked })}
                      />
                      Publish this category page
                    </label>
                    <div className="admin-category-actions is-full">
                      <button
                        type="button"
                        className="button"
                        disabled={saving === row.slug}
                        onClick={() => void save(row)}
                      >
                        <Save size={15} aria-hidden="true" /> Save category
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        disabled={saving === row.slug || !row.overridden}
                        onClick={() => void reset(row)}
                      >
                        <RotateCcw size={15} aria-hidden="true" /> Reset to default
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
