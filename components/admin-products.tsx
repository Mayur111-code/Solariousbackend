"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileUp,
  ImageUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";

type AdminProduct = {
  id?: string;
  slug: string;
  name: string;
  modelNumber?: string;
  category?: string;
  moduleType?:
    "Monofacial" | "Bifacial" | "Monofacial / Bifacial" | "Other" | "";
  status?: "draft" | "published" | "archived";
  technology: string;
  summary: string;
  description?: string;
  image?: string;
  imageStorageId?: string;
  datasheetUrl?: string;
  datasheetStorageId?: string;
  datasheetName?: string;
  datasheetSize?: number;
  applications?: string[];
  features?: string[];
  powerRating?: string;
  efficiency?: string;
  cellType?: string;
  dimensions?: string;
  warranty?: string;
  displayOrder?: number;
  featured?: boolean;
  series?: unknown[];
  technicalSpecifications?: Record<string, unknown>;
  published?: boolean;
};

const emptyProduct = (): AdminProduct => ({
  slug: "",
  name: "",
  modelNumber: "",
  category: "Mono PERC",
  technology: "Mono PERC",
  moduleType: "",
  status: "draft",
  summary: "",
  description: "",
  image: "",
  datasheetUrl: "",
  applications: [],
  features: [],
  powerRating: "",
  efficiency: "",
  cellType: "",
  dimensions: "",
  warranty: "",
  displayOrder: 0,
  featured: false,
  published: false,
});

const listValue = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const productImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const productImageMaxBytes = 8 * 1024 * 1024;
const productDatasheetMaxBytes = 20 * 1024 * 1024;

type DirectUploadSignature = {
  timestamp: number;
  folder: string;
  publicId: string;
  overwrite: boolean;
  signature: string;
  apiKey: string;
  uploadUrl: string;
};
const uploadDirectly = (
  file: File,
  signed: DirectUploadSignature,
  onProgress: (value: number) => void,
) =>
  new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", signed.uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(new Error("The storage service could not be reached."));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText) as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        };
        if (
          request.status < 200 ||
          request.status >= 300 ||
          !result.secure_url ||
          !result.public_id
        )
          throw new Error(result.error?.message || "Cloud upload failed.");
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      } catch (cause) {
        reject(
          cause instanceof Error ? cause : new Error("Cloud upload failed."),
        );
      }
    };
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("api_key", signed.apiKey);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    formData.append("folder", signed.folder);
    formData.append("public_id", signed.publicId);
    formData.append("overwrite", String(signed.overwrite));
    request.send(formData);
  });

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "datasheet" | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch("/api/admin/products");
      if (!response.ok)
        throw await apiError(response, "Products could not be loaded");
      const data = (await response.json()) as { products?: AdminProduct[] };
      setProducts(data.products ?? []);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Products could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const upload = async (file: File, type: "image" | "datasheet") => {
    if (!editing) return;
    if (type === "image" && !productImageTypes.has(file.type)) {
      setError("Choose a JPG, PNG, WebP or AVIF product image.");
      return;
    }
    if (type === "image" && file.size > productImageMaxBytes) {
      setError("Product images must be 8 MB or smaller.");
      return;
    }
    if (
      type === "datasheet" &&
      (file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf"))
    ) {
      setError("Choose a valid PDF datasheet.");
      return;
    }
    if (type === "datasheet" && file.size > productDatasheetMaxBytes) {
      setError("Datasheet PDFs must be 20 MB or smaller.");
      return;
    }
    setError("");
    setNotice("");
    setUploading(type);
    setUploadProgress(0);
    try {
      let data: {
        url: string;
        storageId: string;
        fileName?: string;
        fileSize?: number;
      };
      if (type === "datasheet") {
        const authorization = await adminFetch(
          "/api/admin/products/datasheet-signature",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            }),
          },
        );
        if (!authorization.ok)
          throw await apiError(
            authorization,
            "Datasheet upload could not be authorized",
          );
        const signed = (await authorization.json()) as DirectUploadSignature;
        const uploaded = await uploadDirectly(file, signed, setUploadProgress);
        const verification = await adminFetch(
          "/api/admin/products/verify-datasheet",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: uploaded.secure_url,
              storageId: uploaded.public_id,
              fileName: file.name,
              fileSize: file.size,
            }),
          },
        );
        if (!verification.ok)
          throw await apiError(verification, "Datasheet verification failed");
        data = (await verification.json()) as typeof data;
      } else {
        const form = new FormData();
        form.append("image", file, file.name);
        const response = await adminFetch("/api/admin/products/upload-image", {
          method: "POST",
          body: form,
        });
        if (!response.ok) throw await apiError(response, "Image upload failed");
        data = (await response.json()) as typeof data;
      }
      setEditing((product) =>
        product
          ? {
              ...product,
              [type === "image" ? "image" : "datasheetUrl"]: data.url,
              [type === "image" ? "imageStorageId" : "datasheetStorageId"]:
                data.storageId,
              ...(type === "datasheet"
                ? { datasheetName: data.fileName, datasheetSize: data.fileSize }
                : {}),
            }
          : product,
      );
      if (type === "image") setImagePreview(data.url);
      setNotice(
        `${type === "image" ? "Image" : "Datasheet"} uploaded. Save the product to keep this link.`,
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const creating = !products.some((product) => product.slug === editing.slug);
    const payload = {
      ...editing,
      slug: slugify(editing.slug || editing.name),
      status:
        editing.published === false
          ? editing.status === "archived"
            ? "archived"
            : "draft"
          : ("published" as AdminProduct["status"]),
    };
    if (
      !payload.slug ||
      !payload.name.trim() ||
      !payload.technology.trim() ||
      !payload.summary.trim()
    ) {
      setError(
        "Product name, slug, technology and short description are required.",
      );
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminFetch("/api/admin/products", {
        method: creating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw await apiError(response, "Product could not be saved");
      const data = (await response.json()) as { product: AdminProduct };
      setProducts((current) =>
        creating
          ? [...current, data.product].sort(
              (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
            )
          : current.map((item) =>
              item.slug === editing.slug ? data.product : item,
            ),
      );
      setEditing(null);
      setNotice(
        creating
          ? "Product created successfully."
          : "Product changes saved successfully.",
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Product could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: AdminProduct) => {
    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await adminFetch(
        `/api/admin/products?slug=${encodeURIComponent(product.slug)}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw await apiError(response, "Product could not be deleted");
      setProducts((current) =>
        current.filter((item) => item.slug !== product.slug),
      );
      setNotice("Product deleted successfully.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Product could not be deleted.",
      );
    }
  };

  const togglePublished = async (product: AdminProduct) => {
    setError("");
    setNotice("");
    try {
      const response = await adminFetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          published: product.published === false,
        }),
      });
      if (!response.ok)
        throw await apiError(
          response,
          "Product publication status could not be changed",
        );
      const data = (await response.json()) as { product: AdminProduct };
      setProducts((current) =>
        current.map((item) =>
          item.slug === product.slug ? data.product : item,
        ),
      );
      setNotice(
        product.published === false
          ? "Product published to the public catalogue."
          : "Product returned to draft.",
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Product publication status could not be changed.",
      );
    }
  };
  const archive = async (product: AdminProduct) => {
    const response = await adminFetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...product,
        status: "archived",
        published: false,
      }),
    });
    if (response.ok) {
      const data = (await response.json()) as { product: AdminProduct };
      setProducts((current) =>
        current.map((item) =>
          item.slug === product.slug ? data.product : item,
        ),
      );
      setNotice("Product archived and removed from the public catalogue.");
    } else
      setError(
        (await apiError(response, "Product could not be archived")).message,
      );
  };
  const duplicate = (product: AdminProduct) => {
    const name = `${product.name} Copy`;
    setEditing({
      ...product,
      id: undefined,
      name,
      slug: slugify(name),
      status: "draft",
      published: false,
      imageStorageId: undefined,
      datasheetStorageId: undefined,
    });
    setImagePreview(product.image || "");
    setNotice("Review the duplicated draft, then save it as a new product.");
  };

  const productCount = useMemo(() => products.length, [products.length]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h2>Manage products</h2>
          <p>
            {productCount} catalogue{" "}
            {productCount === 1 ? "product" : "products"}. Drafts stay private
            until published.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setError("");
            setNotice("");
            setImagePreview("");
            setEditing(emptyProduct());
          }}
        >
          <Plus size={16} /> Add product
        </button>
      </div>
      {notice && <div className="admin-notice">{notice}</div>}
      {error && <div className="admin-notice admin-notice-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">
          <Loader2 className="spin" /> Loading products…
        </div>
      ) : (
        <div className="admin-product-grid">
          {products.map((product) => (
            <article key={product.slug}>
              {product.image ? (
                <img src={product.image} alt="" />
              ) : (
                <div className="admin-product-image-empty">No image</div>
              )}
              <div>
                <span>
                  {product.category || product.technology}
                  {product.moduleType ? ` · ${product.moduleType}` : ""}
                </span>
                <h3>{product.name}</h3>
                <p>{product.summary}</p>
                <small>
                  {product.status ||
                    (product.published === false ? "Draft" : "Published")}{" "}
                  · Order {product.displayOrder ?? 0}
                </small>
                <div className="admin-inline-actions">
                  <button
                    className="button button-ghost"
                    onClick={() => {
                      setError("");
                      setImagePreview(product.image ?? "");
                      setEditing({
                        ...product,
                        applications: product.applications ?? [],
                        features: product.features ?? [],
                      });
                    }}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => duplicate(product)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void togglePublished(product)}
                  >
                    {product.published === false ? "Publish" : "Unpublish"}
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => void archive(product)}
                  >
                    Archive
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => void remove(product)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !products.length && (
        <div className="admin-empty">No products have been added yet.</div>
      )}
      {editing && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={() => !saving && setEditing(null)}
        >
          <div
            className="admin-modal admin-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-editor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="product-editor">
              {products.some((item) => item.slug === editing.slug)
                ? "Edit product"
                : "Add product"}
            </h2>
            <form onSubmit={save}>
              <div className="admin-form-grid">
                <label>
                  Product name *
                  <input
                    value={editing.name}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        name: event.target.value,
                        slug: editing.slug || slugify(event.target.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Model number
                  <input
                    value={editing.modelNumber ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        modelNumber: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Slug *
                  <input
                    value={editing.slug}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        slug: slugify(event.target.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Technology
                  <select
                    value={editing.technology}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        category: event.target.value,
                        technology: event.target.value,
                      })
                    }
                  >
                    <option>Mono PERC</option>
                    <option>TOPCon</option>
                    <option>HJT</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Module type
                  <select
                    value={editing.moduleType ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        moduleType: event.target
                          .value as AdminProduct["moduleType"],
                      })
                    }
                  >
                    <option value="">Choose type</option>
                    <option>Monofacial</option>
                    <option>Bifacial</option>
                    <option>Monofacial / Bifacial</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Display order
                  <input
                    type="number"
                    min="0"
                    value={editing.displayOrder ?? 0}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        displayOrder: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(editing.featured)}
                    onChange={(event) =>
                      setEditing({ ...editing, featured: event.target.checked })
                    }
                  />{" "}
                  Featured product
                </label>
              </div>
              <label>
                Short description *
                <textarea
                  rows={3}
                  value={editing.summary}
                  onChange={(event) =>
                    setEditing({ ...editing, summary: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Detailed description
                <textarea
                  rows={4}
                  value={editing.description ?? ""}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                />
              </label>
              <div className="admin-form-grid">
                <label>
                  Power range
                  <input
                    value={editing.powerRating ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        powerRating: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Module efficiency
                  <input
                    value={editing.efficiency ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, efficiency: event.target.value })
                    }
                  />
                </label>
                <label>
                  Cell technology
                  <input
                    value={editing.cellType ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, cellType: event.target.value })
                    }
                  />
                </label>
                <label>
                  Dimensions
                  <input
                    value={editing.dimensions ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, dimensions: event.target.value })
                    }
                  />
                </label>
                <label>
                  Warranty
                  <input
                    value={editing.warranty ?? ""}
                    onChange={(event) =>
                      setEditing({ ...editing, warranty: event.target.value })
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={
                      editing.status === "archived"
                        ? "archived"
                        : editing.published === false
                          ? "draft"
                          : "published"
                    }
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        published: event.target.value === "published",
                        status: event.target.value as AdminProduct["status"],
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>
              <label>
                Applications (one per line)
                <textarea
                  rows={3}
                  value={(editing.applications ?? []).join("\n")}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      applications: listValue(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Features (one per line)
                <textarea
                  rows={3}
                  value={(editing.features ?? []).join("\n")}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      features: listValue(event.target.value),
                    })
                  }
                />
              </label>
              <div className="admin-form-grid">
                <label>
                  Main image URL
                  <input
                    value={editing.image ?? ""}
                    onChange={(event) => {
                      setEditing({ ...editing, image: event.target.value });
                      setImagePreview(event.target.value);
                    }}
                  />
                </label>
                <div className="admin-upload-field">
                  {imagePreview && (
                    <img src={imagePreview} alt="Selected product preview" />
                  )}
                  <label className="admin-file-label">
                    <ImageUp size={16} />{" "}
                    {uploading === "image"
                      ? "Uploading image…"
                      : "Upload main image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={uploading !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (
                          file &&
                          productImageTypes.has(file.type) &&
                          file.size <= productImageMaxBytes
                        )
                          setImagePreview(URL.createObjectURL(file));
                        if (file) void upload(file, "image");
                      }}
                    />
                  </label>
                  <label>
                    Product series and wattage variants (reviewable JSON)
                    <textarea
                      rows={8}
                      defaultValue={JSON.stringify(
                        editing.series ?? [],
                        null,
                        2,
                      )}
                      onBlur={(event) => {
                        try {
                          const value = JSON.parse(event.currentTarget.value);
                          if (!Array.isArray(value)) throw new Error();
                          setEditing({ ...editing, series: value });
                          setError("");
                        } catch {
                          setError(
                            "Product series must be a valid JSON array.",
                          );
                        }
                      }}
                    />
                  </label>
                  <label>
                    Technical specifications (reviewable JSON)
                    <textarea
                      rows={8}
                      defaultValue={JSON.stringify(
                        editing.technicalSpecifications ?? {},
                        null,
                        2,
                      )}
                      onBlur={(event) => {
                        try {
                          const value = JSON.parse(event.currentTarget.value);
                          if (
                            !value ||
                            Array.isArray(value) ||
                            typeof value !== "object"
                          )
                            throw new Error();
                          setEditing({
                            ...editing,
                            technicalSpecifications: value,
                          });
                          setError("");
                        } catch {
                          setError(
                            "Technical specifications must be a valid JSON object.",
                          );
                        }
                      }}
                    />
                  </label>
                </div>
                <label>
                  Datasheet PDF URL
                  <input
                    value={editing.datasheetUrl ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        datasheetUrl: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="admin-file-label">
                  <FileUp size={16} />{" "}
                  {uploading === "datasheet"
                    ? `Uploading datasheet… ${uploadProgress}%`
                    : "Upload datasheet PDF (max 20 MB)"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={uploading !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file, "datasheet");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {editing.datasheetUrl && (
                  <div className="admin-inline-actions">
                    <a
                      className="button button-ghost"
                      href={editing.datasheetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Eye size={15} /> Preview PDF
                    </a>
                    <a
                      className="button button-ghost"
                      href={editing.datasheetUrl}
                      download
                    >
                      <FileUp size={15} /> Download
                    </a>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          datasheetUrl: "",
                          datasheetStorageId: "",
                          datasheetName: "",
                          datasheetSize: 0,
                        })
                      }
                    >
                      Remove PDF
                    </button>
                    {editing.datasheetSize ? (
                      <small>
                        {(editing.datasheetSize / 1024 / 1024).toFixed(1)} MB
                      </small>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="admin-modal-actions">
                {editing.published !== false && editing.slug && (
                  <a
                    className="button button-ghost"
                    href={`/products/${editing.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye size={16} /> Preview
                  </a>
                )}
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  className="button"
                  type="submit"
                  disabled={saving || uploading !== null}
                >
                  {saving ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  {editing.published === false
                    ? "Save draft"
                    : "Publish product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
