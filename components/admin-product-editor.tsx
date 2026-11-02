"use client";

/* Remote catalogue imagery is user-supplied and sized by CSS; next/image cannot
   optimise unknown admin hosts without a loader. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileUp,
  ImageUp,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import {
  DOCUMENT_KIND_OPTIONS,
  MODULE_TYPE_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  emptyProduct,
  slugifyValue,
  toDraft,
  toPayload,
  type AdminDocument,
  type AdminProductRecord,
  type AdminSpecTable,
  type AdminVariant,
} from "@/components/admin-product-types";

const SECTIONS = [
  { id: "basic", label: "1 · Basic information" },
  { id: "images", label: "2 · Images" },
  { id: "highlights", label: "3 · Highlights & features" },
  { id: "specs", label: "4 · Specification groups" },
  { id: "variants", label: "5 · Variants" },
  { id: "trust", label: "6 · Benefits & certifications" },
  { id: "documents", label: "7 · Datasheets & PDFs" },
  { id: "faqs", label: "8 · FAQs" },
  { id: "seo", label: "9 · SEO & publishing" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type Signature = {
  timestamp: number;
  folder: string;
  publicId: string;
  overwrite: boolean;
  signature: string;
  apiKey: string;
  uploadUrl: string;
};

const uploadDirectly = (file: File, signed: Signature, onProgress: (value: number) => void) =>
  new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", signed.uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("The storage service could not be reached."));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText) as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        };
        if (request.status < 200 || request.status >= 300 || !result.secure_url || !result.public_id) {
          throw new Error(result.error?.message || "Cloud upload failed.");
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      } catch (cause) {
        reject(cause instanceof Error ? cause : new Error("Cloud upload failed."));
      }
    };
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);
    form.append("public_id", signed.publicId);
    form.append("overwrite", String(signed.overwrite));
    request.send(form);
  });

const linesToArray = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export default function AdminProductEditor({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: AdminProductRecord | null;
  isNew: boolean;
  onClose: () => void;
  onSaved: (product: AdminProductRecord) => void;
}) {
  const [draft, setDraft] = useState<AdminProductRecord>(() => initial ?? emptyProduct());
  const [section, setSection] = useState<SectionId>("basic");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      if (dirty && !window.confirm("Discard unsaved product changes?")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [dirty, onClose, saving]);

  const update = (patch: Partial<AdminProductRecord>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const updateVariant = (index: number, patch: Partial<AdminVariant>) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, position) =>
        position === index ? { ...variant, ...patch } : variant,
      ),
    }));
    setDirty(true);
  };

  const updateSpecTable = (index: number, patch: Partial<AdminSpecTable>) => {
    setDraft((current) => ({
      ...current,
      specTables: current.specTables.map((table, position) =>
        position === index ? { ...table, ...patch } : table,
      ),
    }));
    setDirty(true);
  };

  const addDefaultSpecGroups = () => {
    const templates: [string, string, string[]][] = [
      ["Electrical specification (STC)", "Irradiance 1000 W/m², AM 1.5, 25 °C.", ["575 Wp"]],
      ["Thermal data", "", ["Value"]],
      ["Mechanical specification", "", ["Specification"]],
      ["Operating conditions", "", ["Value"]],
      ["Packing configuration", "", ['20" GP', '40" HQ']],
    ];
    setDraft((current) => ({
      ...current,
      specTables: [
        ...current.specTables,
        ...templates.map(([title, description, columns]) => ({
          id: slugifyValue(title),
          title,
          description,
          columns,
          rows: [{ label: "", values: columns.map(() => "") }],
          note: "",
          matrix: columns.length > 1 && columns[0] !== "Value" && columns[0] !== "Specification",
        })),
      ],
    }));
    setDirty(true);
  };

  const uploadImage = async (file: File, target: "main" | "gallery") => {
    if (!IMAGE_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Product images must be 8 MB or smaller.");
      return;
    }
    setError("");
    setNotice("");
    setUploading(target);
    try {
      const form = new FormData();
      form.append("image", file, file.name);
      const response = await adminFetch("/api/admin/products/upload-image", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw await apiError(response, "Image upload failed");
      const data = (await response.json()) as { url: string; storageId: string };
      setDraft((current) =>
        target === "main"
          ? { ...current, image: data.url, imageStorageId: data.storageId }
          : { ...current, gallery: [...current.gallery, data.url] },
      );
      setDirty(true);
      setNotice("Image uploaded. Save the product to keep this link.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setUploading("");
    }
  };

  const uploadPdf = async (file: File) => {
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a valid PDF datasheet.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("Datasheet PDFs must be 20 MB or smaller.");
      return;
    }
    setError("");
    setNotice("");
    setUploading("pdf");
    setProgress(0);
    try {
      const authorization = await adminFetch("/api/admin/products/datasheet-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type }),
      });
      if (!authorization.ok) throw await apiError(authorization, "Datasheet upload could not be authorized");
      const signed = (await authorization.json()) as Signature;
      const uploaded = await uploadDirectly(file, signed, setProgress);
      const verification = await adminFetch("/api/admin/products/verify-datasheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: uploaded.secure_url,
          storageId: uploaded.public_id,
          fileName: file.name,
          fileSize: file.size,
        }),
      });
      if (!verification.ok) throw await apiError(verification, "Datasheet verification failed");
      const data = (await verification.json()) as {
        url: string;
        storageId: string;
        fileName?: string;
        fileSize?: number;
      };
      const document: AdminDocument = {
        title: file.name.replace(/\.pdf$/i, ""),
        url: data.url,
        fileSize: data.fileSize,
        kind: "datasheet",
        storageId: data.storageId,
      };
      setDraft((current) => ({
        ...current,
        documents: [...current.documents, document],
        datasheetUrl: data.url,
        datasheetStorageId: data.storageId,
        datasheetName: data.fileName ?? file.name,
        datasheetSize: data.fileSize,
      }));
      setDirty(true);
      setNotice("PDF uploaded and verified. Save the product to keep this link.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Datasheet upload failed.");
    } finally {
      setUploading("");
      setProgress(0);
    }
  };

  const save = async (status: "draft" | "published") => {
    const payload = toPayload(draft, { status });
    if (!payload.name || payload.name.length < 2) return setError("Product name is required.");
    if (!payload.slug) return setError("A slug is required (it is generated from the name).");
    if (!payload.technology) return setError("Technology is required.");
    if (!payload.summary || payload.summary.length < 5)
      return setError("A short summary is required.");
    if (status === "published" && !/^(https?:\/\/|\/)/i.test(payload.image))
      return setError("Upload a product image before publishing.");

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const endpoint = isNew
        ? "/api/admin/products"
        : draft.id
          ? `/api/admin/products/${draft.id}`
          : "/api/admin/products";
      const method = isNew || !draft.id ? (isNew ? "POST" : "PUT") : "PUT";
      const response = await adminFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew || !draft.id ? payload : { ...payload, slug: payload.slug }),
      });
      if (!response.ok) throw await apiError(response, "Product could not be saved");
      const data = (await response.json()) as { product: Record<string, unknown> };
      setDirty(false);
      onSaved(toDraft(data.product));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || Boolean(uploading);

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={() => (busy ? undefined : !dirty || window.confirm("Discard unsaved product changes?") ? onClose() : undefined)}
    >
      <div
        className="admin-modal admin-product-modal admin-product-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-heading"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-product-editor-head">
          <div>
            <span>{isNew ? "New product" : "Editing product"}</span>
            <h2 id="product-editor-heading">{draft.name || "Untitled module"}</h2>
            <p>
              {draft.slug ? `/products/${draft.category}/${draft.slug}` : "Slug generated from the name"}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => (!dirty || window.confirm("Discard unsaved product changes?") ? onClose() : undefined)}
            aria-label="Close product editor"
            disabled={saving}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {notice ? <div className="admin-notice">{notice}</div> : null}
        {error ? (
          <div className="admin-notice admin-notice-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="admin-product-editor-body">
          <nav className="admin-product-sections" aria-label="Product form sections">
            {SECTIONS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={section === entry.id ? "is-active" : ""}
                onClick={() => setSection(entry.id)}
                aria-current={section === entry.id ? "true" : undefined}
              >
                {entry.label}
              </button>
            ))}
          </nav>

          <div className="admin-product-fields">
            {section === "basic" ? (
              <div className="admin-form-grid">
                <label>
                  Product name *
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      update({
                        name: event.target.value,
                        slug: draft.slug && !isNew ? draft.slug : slugifyValue(event.target.value),
                      })
                    }
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  Slug *
                  <input
                    value={draft.slug}
                    onChange={(event) => update({ slug: slugifyValue(event.target.value) })}
                    required
                  />
                </label>
                <label>
                  Model number
                  <input
                    value={draft.modelNumber}
                    onChange={(event) => update({ modelNumber: event.target.value })}
                    maxLength={80}
                  />
                </label>
                <label>
                  Category *
                  <select value={draft.category} onChange={(event) => update({ category: event.target.value })}>
                    {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Technology *
                  <input
                    value={draft.technology}
                    onChange={(event) => update({ technology: event.target.value })}
                    maxLength={120}
                  />
                </label>
                <label>
                  Module type
                  <select value={draft.moduleType} onChange={(event) => update({ moduleType: event.target.value })}>
                    {MODULE_TYPE_OPTIONS.map((option) => (
                      <option key={option || "none"} value={option}>
                        {option || "Not specified"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Power range label
                  <input
                    value={draft.powerRange}
                    onChange={(event) => update({ powerRange: event.target.value })}
                    placeholder="575–600 Wp"
                    maxLength={60}
                  />
                </label>
                <label>
                  Efficiency range label
                  <input
                    value={draft.efficiencyRange}
                    onChange={(event) => update({ efficiencyRange: event.target.value })}
                    placeholder="20.75–21.70%"
                    maxLength={60}
                  />
                </label>
                <label className="is-full">
                  Short summary *
                  <textarea
                    rows={3}
                    value={draft.summary}
                    onChange={(event) => update({ summary: event.target.value })}
                    maxLength={400}
                  />
                </label>
                <label className="is-full">
                  Full description
                  <textarea
                    rows={4}
                    value={draft.description}
                    onChange={(event) => update({ description: event.target.value })}
                    maxLength={6000}
                  />
                </label>
              </div>
            ) : null}

            {section === "images" ? (
              <div className="admin-product-stack">
                <div className="admin-form-grid">
                  <label>
                    Main image URL
                    <input
                      value={draft.image}
                      onChange={(event) => update({ image: event.target.value })}
                      placeholder="/utility-solar.webp"
                    />
                  </label>
                  <div className="admin-upload-field">
                    {draft.image ? <img src={draft.image} alt="Main product preview" /> : null}
                    <label className="admin-file-label">
                      <ImageUp size={16} aria-hidden="true" />{" "}
                      {uploading === "main" ? "Uploading image…" : "Upload main image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadImage(file, "main");
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <label className="is-full">
                    Gallery URLs (one per line)
                    <textarea
                      rows={4}
                      value={draft.gallery.join("\n")}
                      onChange={(event) => update({ gallery: linesToArray(event.target.value) })}
                    />
                  </label>
                  <div className="admin-upload-field">
                    <label className="admin-file-label">
                      <UploadCloud size={16} aria-hidden="true" />{" "}
                      {uploading === "gallery" ? "Uploading image…" : "Add a gallery image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadImage(file, "gallery");
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                {draft.gallery.length ? (
                  <ul className="admin-thumb-list">
                    {draft.gallery.map((source, index) => (
                      <li key={`${source}-${index}`}>
                        <img src={source} alt={`Gallery ${index + 1}`} />
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() =>
                            update({ gallery: draft.gallery.filter((_, position) => position !== index) })
                          }
                          aria-label={`Remove gallery image ${index + 1}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {section === "highlights" ? (
              <div className="admin-product-stack">
                <PairEditor
                  label="Highlight cards"
                  hint="Short title plus one-line explanation, shown on the listing card and hero."
                  entries={draft.highlights}
                  onChange={(entries) => update({ highlights: entries })}
                />
                <PairEditor
                  label="Key specification cards"
                  hint="Label / value pairs rendered as the specification cards under the hero."
                  entries={draft.keySpecs}
                  labelPlaceholder="Power range"
                  valuePlaceholder="575–600 Wp"
                  onChange={(entries) => update({ keySpecs: entries })}
                />
                <label>
                  Feature list (one per line)
                  <textarea
                    rows={5}
                    value={draft.features.join("\n")}
                    onChange={(event) => update({ features: linesToArray(event.target.value) })}
                  />
                </label>
                <label>
                  Applications (one per line)
                  <textarea
                    rows={3}
                    value={draft.applications.join("\n")}
                    onChange={(event) => update({ applications: linesToArray(event.target.value) })}
                  />
                </label>
              </div>
            ) : null}

            {section === "specs" ? (
              <div className="admin-product-stack">
                <div className="admin-section-toolbar">
                  <p>
                    Create one group per datasheet table (electrical, bifacial gain, thermal,
                    mechanical, operating conditions, packing).
                  </p>
                  <button type="button" className="button button-ghost" onClick={addDefaultSpecGroups}>
                    <Plus size={15} aria-hidden="true" /> Add standard groups
                  </button>
                </div>
                {draft.specTables.map((table, index) => (
                  <article className="admin-spec-editor" key={`${table.id}-${index}`}>
                    <header>
                      <label>
                        Group title
                        <input
                          value={table.title}
                          onChange={(event) =>
                            updateSpecTable(index, {
                              title: event.target.value,
                              id: table.id || slugifyValue(event.target.value),
                            })
                          }
                        />
                      </label>
                      <div className="admin-spec-editor-tools">
                        <button
                          type="button"
                          className="icon-button"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...draft.specTables];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            update({ specTables: next });
                          }}
                          aria-label="Move group up"
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={index === draft.specTables.length - 1}
                          onClick={() => {
                            const next = [...draft.specTables];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            update({ specTables: next });
                          }}
                          aria-label="Move group down"
                        >
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() =>
                            update({
                              specTables: draft.specTables.filter((_, position) => position !== index),
                            })
                          }
                          aria-label="Remove group"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </header>

                    <label>
                      Columns (comma separated — wattage classes or units)
                      <input
                        value={table.columns.join(", ")}
                        onChange={(event) =>
                          updateSpecTable(index, {
                            columns: event.target.value.split(",").map((value) => value.trim()),
                          })
                        }
                      />
                    </label>
                    <label>
                      Notes shown under the table
                      <input
                        value={table.note}
                        onChange={(event) => updateSpecTable(index, { note: event.target.value })}
                      />
                    </label>
                    <label className="admin-inline-toggle">
                      <input
                        type="checkbox"
                        checked={table.matrix}
                        onChange={(event) => updateSpecTable(index, { matrix: event.target.checked })}
                      />
                      Highlight the selected variant column
                    </label>

                    <div className="admin-spec-rows">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Parameter</th>
                            {table.columns.map((column, columnIndex) => (
                              <th scope="col" key={`${column}-${columnIndex}`}>
                                {column || `Column ${columnIndex + 1}`}
                              </th>
                            ))}
                            <th scope="col">
                              <span className="sr-only">Row actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              <td>
                                <input
                                  value={row.label}
                                  aria-label={`Row ${rowIndex + 1} parameter`}
                                  onChange={(event) =>
                                    updateSpecTable(index, {
                                      rows: table.rows.map((entry, position) =>
                                        position === rowIndex
                                          ? { ...entry, label: event.target.value }
                                          : entry,
                                      ),
                                    })
                                  }
                                />
                              </td>
                              {table.columns.map((_, columnIndex) => (
                                <td key={columnIndex}>
                                  <input
                                    value={row.values[columnIndex] ?? ""}
                                    aria-label={`Row ${rowIndex + 1} column ${columnIndex + 1} value`}
                                    onChange={(event) =>
                                      updateSpecTable(index, {
                                        rows: table.rows.map((entry, position) => {
                                          if (position !== rowIndex) return entry;
                                          const values = Array.from(
                                            { length: Math.max(table.columns.length, entry.values.length) },
                                            (_, valueIndex) => entry.values[valueIndex] ?? "",
                                          );
                                          values[columnIndex] = event.target.value;
                                          return { ...entry, values };
                                        }),
                                      })
                                    }
                                  />
                                </td>
                              ))}
                              <td>
                                <button
                                  type="button"
                                  className="icon-button danger"
                                  onClick={() =>
                                    updateSpecTable(index, {
                                      rows: table.rows.filter((_, position) => position !== rowIndex),
                                    })
                                  }
                                  aria-label={`Remove row ${rowIndex + 1}`}
                                >
                                  <Trash2 size={13} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        type="button"
                        className="button button-ghost admin-add-row"
                        onClick={() =>
                          updateSpecTable(index, {
                            rows: [
                              ...table.rows,
                              { label: "", values: table.columns.map(() => "") },
                            ],
                          })
                        }
                      >
                        <Plus size={14} aria-hidden="true" /> Add row
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    update({
                      specTables: [
                        ...draft.specTables,
                        {
                          id: "",
                          title: "",
                          description: "",
                          columns: ["Value"],
                          rows: [{ label: "", values: [""] }],
                          note: "",
                          matrix: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} aria-hidden="true" /> Add specification group
                </button>
              </div>
            ) : null}

            {section === "variants" ? (
              <div className="admin-product-stack">
                <div className="admin-section-toolbar">
                  <p>
                    One row per published power class. These values drive the variant switcher, the
                    key specification cards and the enquiry wattage list.
                  </p>
                </div>
                <div className="admin-variant-table-wrap">
                  <table className="admin-variant-table">
                    <thead>
                      <tr>
                        <th scope="col">Label</th>
                        <th scope="col">Pmax (Wp)</th>
                        <th scope="col">Voc</th>
                        <th scope="col">Isc</th>
                        <th scope="col">Vmp</th>
                        <th scope="col">Imp</th>
                        <th scope="col">Efficiency</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.variants.map((variant, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              value={variant.label}
                              aria-label={`Variant ${index + 1} label`}
                              onChange={(event) => updateVariant(index, { label: event.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={50}
                              max={1000}
                              value={variant.power || ""}
                              aria-label={`Variant ${index + 1} power`}
                              onChange={(event) =>
                                updateVariant(index, {
                                  power: Number(event.target.value) || 0,
                                  id: event.target.value,
                                })
                              }
                            />
                          </td>
                          {(["voc", "isc", "vmp", "imp", "efficiency"] as const).map((key) => (
                            <td key={key}>
                              <input
                                value={variant[key]}
                                aria-label={`Variant ${index + 1} ${key}`}
                                onChange={(event) => updateVariant(index, { [key]: event.target.value })}
                              />
                            </td>
                          ))}
                          <td>
                            <button
                              type="button"
                              className="icon-button danger"
                              onClick={() =>
                                update({
                                  variants: draft.variants.filter((_, position) => position !== index),
                                })
                              }
                              aria-label={`Remove variant ${index + 1}`}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() =>
                    update({
                      variants: [
                        ...draft.variants,
                        {
                          id: "",
                          label: "",
                          power: 0,
                          voc: "",
                          isc: "",
                          vmp: "",
                          imp: "",
                          efficiency: "",
                          tolerance: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} aria-hidden="true" /> Add variant
                </button>
              </div>
            ) : null}

            {section === "trust" ? (
              <div className="admin-product-stack">
                <PairEditor
                  label="Technical benefits"
                  hint="Rendered as the engineering-advantage cards. Keep claims specific to this module."
                  entries={draft.benefits}
                  onChange={(entries) => update({ benefits: entries })}
                />
                <div className="admin-form-grid">
                  <label>
                    Product warranty
                    <input
                      value={draft.warranty.product}
                      onChange={(event) =>
                        update({ warranty: { ...draft.warranty, product: event.target.value } })
                      }
                    />
                  </label>
                  <label>
                    Performance warranty
                    <input
                      value={draft.warranty.performance}
                      onChange={(event) =>
                        update({ warranty: { ...draft.warranty, performance: event.target.value } })
                      }
                    />
                  </label>
                  <label className="is-full">
                    Warranty caveat
                    <input
                      value={draft.warranty.note ?? ""}
                      onChange={(event) =>
                        update({ warranty: { ...draft.warranty, note: event.target.value } })
                      }
                    />
                  </label>
                  <label className="is-full">
                    Certifications (one per line)
                    <textarea
                      rows={4}
                      value={draft.certifications.join("\n")}
                      onChange={(event) => update({ certifications: linesToArray(event.target.value) })}
                    />
                  </label>
                  <label className="is-full">
                    Data-review notes (one per line, shown to the public as a verification notice)
                    <textarea
                      rows={3}
                      value={draft.reviewNotes.join("\n")}
                      onChange={(event) => update({ reviewNotes: linesToArray(event.target.value) })}
                    />
                  </label>
                  <label className="admin-inline-toggle is-full">
                    <input
                      type="checkbox"
                      checked={draft.specsPending}
                      onChange={(event) => update({ specsPending: event.target.checked })}
                    />
                    Specifications pending — show the &ldquo;request specifications&rdquo; state
                  </label>
                </div>
              </div>
            ) : null}

            {section === "documents" ? (
              <div className="admin-product-stack">
                <div className="admin-section-toolbar">
                  <p>Upload PDFs through the signed, server-verified flow (max 20 MB each).</p>
                  <label className="admin-file-label">
                    <FileUp size={16} aria-hidden="true" />{" "}
                    {uploading === "pdf" ? `Uploading… ${progress}%` : "Upload PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadPdf(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                {draft.documents.map((document, index) => (
                  <article className="admin-document-editor" key={`${document.url}-${index}`}>
                    <label>
                      Title
                      <input
                        value={document.title}
                        onChange={(event) =>
                          update({
                            documents: draft.documents.map((entry, position) =>
                              position === index ? { ...entry, title: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={document.kind}
                        onChange={(event) =>
                          update({
                            documents: draft.documents.map((entry, position) =>
                              position === index
                                ? { ...entry, kind: event.target.value as AdminDocument["kind"] }
                                : entry,
                            ),
                          })
                        }
                      >
                        {DOCUMENT_KIND_OPTIONS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="is-full">
                      URL
                      <input
                        value={document.url}
                        onChange={(event) =>
                          update({
                            documents: draft.documents.map((entry, position) =>
                              position === index ? { ...entry, url: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="admin-document-meta">
                      <small>
                        {document.fileSize
                          ? `${(document.fileSize / 1024 / 1024).toFixed(1)} MB`
                          : "Size unknown"}
                      </small>
                      <a className="button button-ghost" href={document.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() =>
                          update({
                            documents: draft.documents.filter((_, position) => position !== index),
                          })
                        }
                      >
                        <Trash2 size={14} aria-hidden="true" /> Remove
                      </button>
                    </div>
                  </article>
                ))}
                {!draft.documents.length ? (
                  <p className="admin-empty-inline">
                    No documents yet. Upload the approved datasheet PDF first.
                  </p>
                ) : null}
              </div>
            ) : null}

            {section === "faqs" ? (
              <div className="admin-product-stack">
                <div className="admin-section-toolbar">
                  <p>Answer only what the datasheet or company documentation supports.</p>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => update({ faqs: [...draft.faqs, { question: "", answer: "" }] })}
                  >
                    <Plus size={14} aria-hidden="true" /> Add FAQ
                  </button>
                </div>
                {draft.faqs.map((faq, index) => (
                  <article className="admin-faq-editor" key={index}>
                    <label>
                      Question
                      <input
                        value={faq.question}
                        onChange={(event) =>
                          update({
                            faqs: draft.faqs.map((entry, position) =>
                              position === index ? { ...entry, question: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Answer
                      <textarea
                        rows={3}
                        value={faq.answer}
                        onChange={(event) =>
                          update({
                            faqs: draft.faqs.map((entry, position) =>
                              position === index ? { ...entry, answer: event.target.value } : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() =>
                        update({ faqs: draft.faqs.filter((_, position) => position !== index) })
                      }
                    >
                      <Trash2 size={14} aria-hidden="true" /> Remove FAQ
                    </button>
                  </article>
                ))}
                {!draft.faqs.length ? <p className="admin-empty-inline">No FAQs yet.</p> : null}
              </div>
            ) : null}

            {section === "seo" ? (
              <div className="admin-product-stack">
                <div className="admin-form-grid">
                  <label className="is-full">
                    SEO title
                    <input
                      value={draft.seo.title}
                      maxLength={70}
                      onChange={(event) => update({ seo: { ...draft.seo, title: event.target.value } })}
                    />
                  </label>
                  <label className="is-full">
                    Meta description
                    <textarea
                      rows={3}
                      maxLength={180}
                      value={draft.seo.description}
                      onChange={(event) =>
                        update({ seo: { ...draft.seo, description: event.target.value } })
                      }
                    />
                  </label>
                  <label className="is-full">
                    Keywords (comma separated)
                    <input
                      value={draft.seo.keywords.join(", ")}
                      onChange={(event) =>
                        update({
                          seo: {
                            ...draft.seo,
                            keywords: event.target.value.split(",").map((value) => value.trim()),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Display order
                    <input
                      type="number"
                      min={0}
                      value={draft.displayOrder}
                      onChange={(event) => update({ displayOrder: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label className="admin-inline-toggle">
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(event) => update({ featured: event.target.checked })}
                    />
                    Feature this product
                  </label>
                </div>
                <div className="admin-publish-summary">
                  <Info size={17} aria-hidden="true" />
                  <div>
                    <strong>Publishing state: {draft.status}</strong>
                    <p>
                      Drafts are hidden from the public catalogue. Publishing requires a product
                      image. Archived products stay out of the catalogue until re-published.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="admin-product-editor-footer">
          {!isNew && draft.slug ? (
            <a
              className="button button-ghost"
              href={`/products/${draft.category}/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Preview
            </a>
          ) : null}
          <span className="admin-product-editor-spacer" />
          <button type="button" className="button button-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => void save("draft")}
            disabled={busy}
          >
            {saving ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            Save draft
          </button>
          <button type="button" className="button" onClick={() => void save("published")} disabled={busy}>
            {saving ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            Publish
          </button>
        </footer>
      </div>
    </div>
  );
}

function PairEditor({
  label,
  hint,
  entries,
  onChange,
  labelPlaceholder = "Title",
  valuePlaceholder = "Description",
}: {
  label: string;
  hint?: string;
  entries: { title: string; description: string }[];
  onChange: (entries: { title: string; description: string }[]) => void;
  labelPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  return (
    <fieldset className="admin-pair-editor">
      <legend>{label}</legend>
      {hint ? <p>{hint}</p> : null}
      {entries.map((entry, index) => (
        <div className="admin-pair-row" key={index}>
          <input
            value={entry.title}
            aria-label={`${label} ${index + 1} title`}
            placeholder={labelPlaceholder}
            onChange={(event) =>
              onChange(
                entries.map((item, position) =>
                  position === index ? { ...item, title: event.target.value } : item,
                ),
              )
            }
          />
          <input
            value={entry.description}
            aria-label={`${label} ${index + 1} description`}
            placeholder={valuePlaceholder}
            onChange={(event) =>
              onChange(
                entries.map((item, position) =>
                  position === index ? { ...item, description: event.target.value } : item,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-button danger"
            onClick={() => onChange(entries.filter((_, position) => position !== index))}
            aria-label={`Remove ${label} ${index + 1}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-ghost admin-add-row"
        onClick={() => onChange([...entries, { title: "", description: "" }])}
      >
        <Plus size={14} aria-hidden="true" /> Add entry
      </button>
    </fieldset>
  );
}
