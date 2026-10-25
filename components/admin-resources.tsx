"use client";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import DocumentPreviewModal, {
  type DocumentPreview,
} from "@/components/document-preview-modal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  product: string;
  issuingOrganization?: string;
  certificateNumber?: string;
  previewImageUrl?: string;
  previewImageStorageId?: string;
  logoUrl?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationUrl?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  published: number;
  display_order: number;
  updated_at: string;
};
type Upload = {
  key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  storageId: string;
};
type PreviewUpload = { url: string; storageId: string };
const documentTypes:Record<string,string>={pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
const documentType=(file:File)=>file.type||documentTypes[file.name.split(".").pop()?.toLowerCase()||""]||"";
function streamUpload(
  file: File,
  onProgress: (value: number) => void,
  signalRef: React.MutableRefObject<XMLHttpRequest | null>,
) {
  return new Promise<{
    upload: Upload;
    timing: { storageMs: number; totalMs: number };
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signalRef.current = xhr;
    xhr.open("POST", "/api/admin/resources/upload");
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.setRequestHeader("Content-Type", documentType(file));
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(xhr.status === 401 ? "Your admin session expired. Sign in again before uploading." : xhr.status === 403 ? data.error ?? "The upload was rejected by the production origin policy." : data.error ?? "Upload failed."));
      } catch {
        reject(new Error("Invalid upload response."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}
async function uploadThumbnail(file: File): Promise<PreviewUpload> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Thumbnail must be a JPG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Thumbnail must be 5 MB or smaller.");
  const formData = new FormData();
  formData.append("file", file, file.name);
  const response = await adminFetch("/api/admin/site-content/upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Thumbnail upload failed.");
  return { url: data.url, storageId: data.storageId };
}
export default function AdminResources() {
  const [items, setItems] = useState<Resource[]>([]),
    [categories, setCategories] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Resource | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState<DocumentPreview | null>(null),
    [localPreviewUrl, setLocalPreviewUrl] = useState(""),
    [localPreviewFile, setLocalPreviewFile] = useState<File | null>(null),
    [retryForm, setRetryForm] = useState<HTMLFormElement | null>(null);
  const request = useRef<XMLHttpRequest | null>(null);
  const load = useCallback(
    () =>
      adminFetch("/api/admin/resources")
        .then(async (r) => { if(!r.ok) throw await apiError(r,"Resources could not be loaded"); return r.json(); })
        .then((d) => {
          setItems(d.resources ?? []);
          setCategories(d.categories ?? []);
        }).catch(error=>setNotice(error instanceof Error?error.message:"Resources could not be loaded.")),
    [],
  );
  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);
  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);
  const closePreview = useCallback(() => setPreview(null), []);
  const closeEditor = () => {
    setEditing(undefined);
    setLocalPreviewFile(null);
    setLocalPreviewUrl("");
  };
  const chooseDocument = (file?: File) => {
    setLocalPreviewFile(file?.size ? file : null);
    setLocalPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file?.size ? URL.createObjectURL(file) : "";
    });
  };
  const previewResource = (item: Resource) => {
    const previewUrl = `/api/admin/resources/${item.id}/file`;
    setPreview({title:item.title,fileName:item.file_name,fileType:item.file_type,previewUrl,downloadUrl:`${previewUrl}?download=1`});
  };
  const filtered = useMemo(
    () =>
      items.filter((x) =>
        `${x.title} ${x.category} ${x.product}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget,
      data = new FormData(form),
      file = data.get("file") as File,
      thumbnail = data.get("previewImage") as File;
    if(file?.size&&!Object.values(documentTypes).includes(documentType(file))){setNotice("Choose a PDF, PNG, JPEG, WebP, DOC, DOCX, XLS or XLSX document.");return}
    if (file?.size > 20 * 1024 * 1024) {
      setNotice("File exceeds the 20 MB limit.");
      return;
    }
    if(thumbnail?.size&&!['image/jpeg','image/png','image/webp'].includes(thumbnail.type)){setNotice("Thumbnail must be a JPG, PNG or WebP image.");return}
    if(thumbnail?.size>5*1024*1024){setNotice("Thumbnail must be 5 MB or smaller.");return}
    setBusy(true);
    setProgress(0);
    setNotice("");
    setRetryForm(form);
    let uploaded: Upload | undefined;
    try {
      let timing, previewUpload: PreviewUpload | undefined;
      if (file?.size) {
        const result = await streamUpload(file, setProgress, request);
        uploaded = result.upload;
        timing = result.timing;
      } else if (!editing) throw new Error("Choose a document to upload.");
      if (thumbnail?.size) previewUpload = await uploadThumbnail(thumbnail);
      const payload = {
          id: editing?.id,
          title: data.get("title"),
          description: data.get("description"),
          category: data.get("category"),
          product: data.get("product"),
          issuingOrganization: data.get("issuingOrganization"),
          certificateNumber: data.get("certificateNumber"),
          previewImageUrl: data.get("previewImageUrl"),
          logoUrl: data.get("logoUrl"),
          issueDate: data.get("issueDate"),
          expiryDate: data.get("expiryDate"),
          verificationUrl: data.get("verificationUrl"),
          displayOrder: Number(data.get("displayOrder")),
          published: data.get("published") === "true",
          upload: uploaded,
          previewUpload,
        };
      const r = await adminFetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error ?? "Resource could not be saved.");
      if (out.resource)
        setItems((v) =>
          editing
            ? v.map((x) => (x.id === out.resource.id ? out.resource : x))
            : [out.resource, ...v],
        );
      setNotice(
        `Resource saved successfully.${timing ? ` Upload: ${timing.totalMs} ms (storage ${timing.storageMs} ms).` : ""}`,
      );
      closeEditor();
      setRetryForm(null);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Upload failed. Please retry.",
      );
    } finally {
      setBusy(false);
      request.current = null;
    }
  }
  async function toggle(x: Resource) {
    const r = await adminFetch("/api/admin/resources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: x.id, published: !x.published }),
    });
    const result = await r.json().catch(() => ({}));
    if (r.ok) {
      setItems((v) => v.map((i) => i.id === x.id ? result.resource || { ...i, published: x.published ? 0 : 1 } : i));
      setNotice(x.published ? "Document unpublished." : "Document published on the About Us page.");
    } else setNotice(result.error ?? "Publishing status could not be changed.");
  }
  async function remove(x: Resource) {
    if (!confirm(`Delete ${x.title} and its stored file?`)) return;
    const r = await adminFetch(`/api/admin/resources?id=${x.id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setItems((v) => v.filter((i) => i.id !== x.id));
      setNotice("Resource deleted.");
    } else setNotice((await r.json().catch(() => ({}))).error ?? "Document could not be deleted.");
  }
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h2>Documents &amp; Certifications</h2>
          <p>Upload, preview, order and publish documents on the About Us page.</p>
        </div>
        <button className="button" onClick={() => { chooseDocument(undefined); setEditing(null); }}>
          <FilePlus2 size={16} /> Add document
        </button>
      </div>
      {notice && (
        <div className="admin-notice">
          {notice}
          {retryForm && !busy && editing !== undefined && (
            <button
              className="button button-ghost"
              onClick={() => retryForm.requestSubmit()}
            >
              <RotateCcw size={15} /> Retry
            </button>
          )}
        </div>
      )}
      <div className="resource-admin-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources"
        />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>File</th>
              <th>Order</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.title}</strong>
                  <small>{x.description}</small>
                </td>
                <td>
                  {x.category}
                  <small>{x.product}</small>
                </td>
                <td>
                  <button className="admin-file-preview" type="button" onClick={() => previewResource(x)}>
                    {x.file_name}
                  </button>
                  <small>{(x.file_size / 1024 / 1024).toFixed(1)} MB</small>
                </td>
                <td>{x.display_order}</td>
                <td>
                  <button
                    className={`publish-toggle ${x.published ? "on" : ""}`}
                    onClick={() => void toggle(x)}
                  >
                    {x.published ? "Published" : "Draft"}
                  </button>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      onClick={() => { chooseDocument(undefined); setEditing(x); }}
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <a
                      className="icon-button"
                      href={`/api/admin/resources/${x.id}/file?download=1`}
                      aria-label="Download"
                    >
                      <Download size={15} />
                    </a>
                    <button
                      className="icon-button danger"
                      onClick={() => void remove(x)}
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="admin-empty">No resources found.</div>
        )}
      </div>
      {editing !== undefined && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={() => !busy && closeEditor()}
        >
          <div
            className="admin-modal"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="modal-close"
              disabled={busy}
              onClick={closeEditor}
              aria-label="Close"
            >
              <X />
            </button>
            <h2>{editing ? "Edit resource" : "Add resource"}</h2>
            <form onSubmit={save}>
              <label>
                Title *
                <input name="title" required defaultValue={editing?.title} />
              </label>
              <label>
                Short description
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editing?.description}
                />
              </label>
              <label>
                Category *
                <select
                  name="category"
                  required
                  defaultValue={editing?.category ?? ""}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Related product
                <input
                  name="product"
                  defaultValue={editing?.product}
                  placeholder="Optional"
                />
              </label>
              <div className="admin-form-grid">
                <label>Issuing organization<input name="issuingOrganization" defaultValue={editing?.issuingOrganization} /></label>
                <label>Certificate number<input name="certificateNumber" defaultValue={editing?.certificateNumber} /></label>
                <label>Issue date<input name="issueDate" type="date" defaultValue={editing?.issueDate?.slice(0,10)} /></label>
                <label>Expiry date<input name="expiryDate" type="date" defaultValue={editing?.expiryDate?.slice(0,10)} /></label>
                <label>Certificate logo URL<input name="logoUrl" type="url" defaultValue={editing?.logoUrl} /></label>
                <label>Preview image URL<input name="previewImageUrl" type="url" defaultValue={editing?.previewImageUrl} /></label>
                <label>Upload thumbnail<input name="previewImage" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                <label>Verification URL<input name="verificationUrl" type="url" defaultValue={editing?.verificationUrl} /></label>
              </div>
              <label>
                Display order
                <input
                  name="displayOrder"
                  type="number"
                  defaultValue={editing?.display_order ?? 0}
                />
              </label>
              <label>
                Document {editing ? "(choose only to replace)" : "*"}
                <input
                  name="file"
                  type="file"
                  required={!editing}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => chooseDocument(event.currentTarget.files?.[0])}
                />
              </label>
              {(localPreviewFile || editing) && (
                <button
                  type="button"
                  className="button button-ghost admin-document-preview"
                  onClick={() => {
                    if (localPreviewFile && localPreviewUrl) {
                      setPreview({
                        title: localPreviewFile.name,
                        fileName: localPreviewFile.name,
                        fileType: documentType(localPreviewFile),
                        previewUrl: localPreviewUrl,
                      });
                    } else if (editing) previewResource(editing);
                  }}
                >
                  <Eye size={16} /> Preview document before publishing
                </button>
              )}
              <label className="checkbox-label">
                <input
                  name="published"
                  type="checkbox"
                  value="true"
                  defaultChecked={Boolean(editing?.published)}
                />{" "}
                Publish immediately
              </label>
              {busy && (
                <div
                  className="upload-progress"
                  role="status"
                  aria-live="polite"
                >
                  <div>
                    <span>
                      {progress < 100 ? "Uploading…" : "Saving metadata…"}
                    </span>
                    <strong>{progress}%</strong>
                  </div>
                  <progress max="100" value={progress} />
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => request.current?.abort()}
                  >
                    Cancel upload
                  </button>
                </div>
              )}
              <p className="assumption">
                PDF, PNG, JPEG, WebP, DOC, DOCX, XLS or XLSX; maximum 20 MB. File bytes stream to
                persistent cloud storage; only metadata is saved in the
                database.
              </p>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={busy}
                  onClick={closeEditor}
                >
                  Cancel
                </button>
                <button className="button" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : null}
                  {busy ? "Uploading…" : "Save resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DocumentPreviewModal document={preview} onClose={closePreview} />
    </section>
  );
}
