"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileText, Plus, Save, ShieldAlert, Star, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { apiError } from "@/lib/api-error";
import {
  AdminConfirmDialog,
  AdminDataTable,
  AdminPageHeader,
  AdminStatCard,
  AdminStatusBadge,
} from "@/components/admin-ui";

type Certification = {
  id: string;
  code: string;
  name: string;
  category: string;
  standards: string[];
  scope: string;
  auditRelevance: string;
  certificateNumber: string;
  documentResourceId: string;
  verificationStatus: string;
  issuedAt?: string;
  expiresAt?: string;
  published: boolean;
  displayOrder: number;
};

type Document = { id: string; title: string; file_name?: string; category?: string };

const empty = {
  code: "",
  name: "",
  category: "bis",
  standards: "",
  scope: "",
  auditRelevance: "",
  certificateNumber: "",
  documentResourceId: "",
  verificationStatus: "unverified",
  issuedAt: "",
  expiresAt: "",
  published: false,
  displayOrder: 0,
};

type Form = typeof empty;

const toForm = (item: Certification): Form => ({
  code: item.code || "",
  name: item.name,
  category: item.category,
  standards: (item.standards || []).join(", "),
  scope: item.scope || "",
  auditRelevance: item.auditRelevance || "",
  certificateNumber: item.certificateNumber || "",
  documentResourceId: item.documentResourceId || "",
  verificationStatus: item.verificationStatus || "unverified",
  issuedAt: item.issuedAt ? String(item.issuedAt).slice(0, 10) : "",
  expiresAt: item.expiresAt ? String(item.expiresAt).slice(0, 10) : "",
  published: Boolean(item.published),
  displayOrder: Number(item.displayOrder) || 0,
});

export default function AdminCertifications() {
  const [items, setItems] = useState<Certification[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string; description: string }[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, verified: 0, pending: 0, expired: 0 });
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [certResponse, docResponse] = await Promise.all([
        adminFetch("/api/admin/certifications"),
        adminFetch("/api/admin/resources"),
      ]);
      if (!certResponse.ok) throw await apiError(certResponse, "Certifications could not be loaded");
      const data = await certResponse.json();
      setItems(data.certifications ?? []);
      setStats(data.stats ?? { total: 0, published: 0, verified: 0, pending: 0, expired: 0 });
      setCategories(data.options?.categories ?? []);
      if (docResponse.ok) {
        const docs = await docResponse.json();
        setDocuments(
          (docs.resources ?? []).map((resource: Document & { file_name?: string }) => ({
            id: resource.id,
            title: resource.title,
            file_name: resource.file_name,
            category: resource.category,
          })),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Certifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const set = (key: keyof Form, value: string | boolean | number) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFields((current) => ({ ...current, [key]: "" }));
  };

  function resetForm() {
    setForm(empty);
    setEditing(null);
    setFields({});
  }

  async function save() {
    setBusy(true);
    setError("");
    setFields({});
    try {
      const payload = {
        ...form,
        standards: form.standards,
        issuedAt: form.issuedAt || "",
        expiresAt: form.expiresAt || "",
      };
      const response = await adminFetch(
        editing ? `/api/admin/certifications/${editing}` : "/api/admin/certifications",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body?.fields) setFields(body.fields);
        throw new Error(body?.error || "The certification could not be saved.");
      }
      setNotice(editing ? "Certification updated." : "Certification created.");
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The certification could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await adminFetch(`/api/admin/certifications/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw await apiError(response, "The certification could not be deleted");
      setNotice("Certification deleted.");
      setDeleteTarget(null);
      if (editing === deleteTarget.id) resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The certification could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const documentOptions = documents.filter((document) => document.file_name?.toLowerCase().endsWith(".pdf") || document.category === "Certificates");

  return (
    <>
      <AdminPageHeader
        eyebrow="Compliance"
        title="Certifications & Bankability"
        description="Only records marked verified with a linked certificate document are published as obtained claims."
      />

      <section className="enterprise-stats-grid">
        <AdminStatCard label="Records" value={stats.total} icon={FileText} detail={`${stats.published} published`} />
        <AdminStatCard label="Verified" value={stats.verified} icon={BadgeCheck} tone="green" detail="With certificate on file" />
        <AdminStatCard label="Pending review" value={stats.pending} icon={ShieldAlert} tone="orange" detail="Not yet verified" />
        <AdminStatCard label="Expired" value={stats.expired} icon={Star} tone="red" detail="Renewal required" />
      </section>

      {notice && <div className="enterprise-alert success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
      {error && <div className="enterprise-alert error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}

      <section className="enterprise-card" style={{ marginTop: 18 }}>
        <header>
          <div>
            <h2>{editing ? "Edit certification" : "Add certification"}</h2>
            <p>Attach an uploaded certificate document before marking a record verified.</p>
          </div>
          {editing && <button type="button" onClick={resetForm}>Cancel edit</button>}
        </header>
        <div className="cert-admin-grid">
          <label>
            Certification name *
            <input value={form.name} onChange={(event) => set("name", event.target.value)} aria-invalid={Boolean(fields.name)} />
            {fields.name ? <span className="field-error">{fields.name}</span> : null}
          </label>
          <label>
            Internal code
            <input value={form.code} onChange={(event) => set("code", event.target.value.toUpperCase())} placeholder="BIS-14286" />
          </label>
          <label>
            Category *
            <select value={form.category} onChange={(event) => set("category", event.target.value)} aria-invalid={Boolean(fields.category)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
            {fields.category ? <span className="field-error">{fields.category}</span> : null}
          </label>
          <label>
            Verification status *
            <select value={form.verificationStatus} onChange={(event) => set("verificationStatus", event.target.value)} aria-invalid={Boolean(fields.verificationStatus)}>
              <option value="unverified">Unverified (documentation pending)</option>
              <option value="pending">Pending review</option>
              <option value="verified">Verified (document on file)</option>
            </select>
            {fields.verificationStatus ? <span className="field-error">{fields.verificationStatus}</span> : null}
          </label>
          <label className="full">
            Applicable standards * <span className="field-hint">Comma separated, e.g. IS 14286, IS/IEC 61730</span>
            <input value={form.standards} onChange={(event) => set("standards", event.target.value)} aria-invalid={Boolean(fields.standards)} />
            {fields.standards ? <span className="field-error">{fields.standards}</span> : null}
          </label>
          <label className="full">
            Certificate document
            <select value={form.documentResourceId} onChange={(event) => set("documentResourceId", event.target.value)}>
              <option value="">No document linked</option>
              {documentOptions.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
            <span className="field-hint">Upload PDFs in the Resources module first, then link them here.</span>
            {fields.documentResourceId ? <span className="field-error">{fields.documentResourceId}</span> : null}
          </label>
          <label>
            Certificate number
            <input value={form.certificateNumber} onChange={(event) => set("certificateNumber", event.target.value)} />
            <span className="field-hint">Only shown publicly when the record is verified.</span>
          </label>
          <label>
            Display order
            <input type="number" min={0} value={form.displayOrder} onChange={(event) => set("displayOrder", Number(event.target.value) || 0)} />
          </label>
          <label>
            Issued on
            <input type="date" value={form.issuedAt} onChange={(event) => set("issuedAt", event.target.value)} aria-invalid={Boolean(fields.issuedAt)} />
            {fields.issuedAt ? <span className="field-error">{fields.issuedAt}</span> : null}
          </label>
          <label>
            Valid until
            <input type="date" value={form.expiresAt} onChange={(event) => set("expiresAt", event.target.value)} aria-invalid={Boolean(fields.expiresAt)} />
            {fields.expiresAt ? <span className="field-error">{fields.expiresAt}</span> : null}
          </label>
          <label className="full">
            Scope
            <textarea rows={2} value={form.scope} onChange={(event) => set("scope", event.target.value)} />
          </label>
          <label className="full">
            Audit relevance
            <textarea rows={2} value={form.auditRelevance} onChange={(event) => set("auditRelevance", event.target.value)} />
          </label>
          <label className="rfq-consent full" style={{ margin: 0 }}>
            <input type="checkbox" checked={form.published} onChange={(event) => set("published", event.target.checked)} />
            <span>Publish this record on the public certifications page</span>
          </label>
        </div>
        <div className="wizard-actions" style={{ marginTop: 16 }}>
          <button type="button" className="button button-ghost" onClick={resetForm} disabled={busy}>Reset</button>
          <button type="button" className="button" onClick={() => void save()} disabled={busy}>
            {editing ? <Save size={16} /> : <Plus size={16} />} {busy ? "Saving…" : editing ? "Save changes" : "Add certification"}
          </button>
        </div>
      </section>

      <section className="enterprise-card" style={{ marginTop: 18 }}>
        <header>
          <div>
            <h2>Certification records</h2>
            <p>{loading ? "Loading…" : `${items.length} record${items.length === 1 ? "" : "s"}`}</p>
          </div>
        </header>
        {loading ? (
          <div className="enterprise-loading"><span /><strong>Loading certifications…</strong></div>
        ) : (
          <AdminDataTable label="Certification records">
            <table>
              <thead>
                <tr>
                  <th scope="col">Certification</th>
                  <th scope="col">Category</th>
                  <th scope="col">Standards</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Published</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong><small>{item.certificateNumber || item.code || "—"}</small></td>
                    <td>{categories.find((category) => category.id === item.category)?.label || item.category}</td>
                    <td><small>{(item.standards || []).join(", ")}</small></td>
                    <td><AdminStatusBadge status={item.verificationStatus} /></td>
                    <td>{item.published ? "Yes" : "No"}</td>
                    <td>
                      <div className="enterprise-row-actions">
                        <button type="button" onClick={() => { setEditing(item.id); setForm(toForm(item)); setFields({}); }}>Edit</button>
                        <button type="button" className="danger" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.name}`}><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataTable>
        )}
        {!loading && !items.length && (
          <div className="admin-empty"><ShieldAlert /><strong>No certifications yet</strong><p>Add BIS, ALMM, IEC or ISO records and link their documents.</p></div>
        )}
      </section>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete certification record?"
        description={`${deleteTarget?.name || "This record"} will be removed from the compliance registry. The linked resource document is not deleted.`}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
