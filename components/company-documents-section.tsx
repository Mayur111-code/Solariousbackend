"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Download,
  Eye,
  FileCheck2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import DocumentPreviewModal, {
  type DocumentPreview,
} from "@/components/document-preview-modal";

type CompanyDocument = {
  id: string;
  title: string;
  description: string;
  category: string;
  product?: string;
  previewImageUrl?: string;
  logoUrl?: string;
  issuingOrganization?: string;
  certificateNumber?: string;
  issueDate?: string;
  updated_at?: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatIssueDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

function fileTypeLabel(item: CompanyDocument) {
  const type = (item.file_type || "").toLowerCase();
  if (type === "application/pdf") return "PDF";
  if (type.startsWith("image/")) return type.split("/")[1]?.toUpperCase() || "Image";
  if (type.includes("wordprocessingml") || type === "application/msword") return "DOC";
  if (type.includes("spreadsheetml") || type === "application/vnd.ms-excel") return "XLS";
  const extension = item.file_name?.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "File";
}

function DocumentIcon({ item }: { item: CompanyDocument }) {
  const type = (item.file_type || "").toLowerCase();
  const common = { size: 38, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (type === "application/pdf") return <FileText {...common} />;
  if (type.startsWith("image/")) return <FileImage {...common} />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet {...common} />;
  if ((item.category || "").toLowerCase().includes("certificate")) return <FileCheck2 {...common} />;
  return <FileType2 {...common} />;
}

/** Managed thumbnail first, then the image document itself, then a safe file tile. */
function DocumentThumbnail({
  item,
  fileUrl,
}: {
  item: CompanyDocument;
  fileUrl: string;
}) {
  const [failed, setFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const isImage = (item.file_type || "").toLowerCase().startsWith("image/");
  const managed = item.previewImageUrl?.trim();
  const src = failed ? "" : managed || (isImage ? fileUrl : "");
  const typeLabel = fileTypeLabel(item);
  const logo = item.logoUrl?.trim();

  return (
    <div className={`doc-thumb ${src ? "has-image" : "has-placeholder"}`}>
      {src ? (
        <img
          className="doc-thumb-image"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="doc-sheet" aria-hidden="true">
          <span className="doc-sheet-fold" />
          <DocumentIcon item={item} />
          <strong>{typeLabel}</strong>
        </div>
      )}
      {logo && !logoFailed && (
        <img
          className="doc-logo"
          src={logo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      )}
      <span className="doc-type-badge">{typeLabel}</span>
    </div>
  );
}

export default function CompanyDocumentsSection({
  initialResources = [],
}: {
  initialResources?: CompanyDocument[];
}) {
  const [items, setItems] = useState<CompanyDocument[]>(initialResources);
  const [loading, setLoading] = useState(initialResources.length === 0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const hasInitialResources = initialResources.length > 0;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/resources", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Published documents could not be loaded.");
        return response.json();
      })
      .then((data: { resources?: CompanyDocument[] }) => setItems(data.resources || []))
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!hasInitialResources) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Published documents could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hasInitialResources]);

  const openPreview = (item: CompanyDocument) => {
    const previewUrl = `/api/resources/${item.id}/file`;
    setPreview({
      title: item.title,
      fileName: item.file_name,
      fileType: item.file_type,
      previewUrl,
      downloadUrl: `${previewUrl}?download=1`,
    });
  };

  return (
    <section
      id="company-documents"
      className="company-documents doc-gallery"
      aria-labelledby="company-documents-title"
    >
      <div className="doc-gallery-heading">
        <div>
          <p className="eyebrow"><span /> Approved company records</p>
          <h2 id="company-documents-title">Company Documents &amp; Certifications</h2>
        </div>
        <p>
          Browse documents published by an authorised Solarious administrator.
          Draft and withdrawn files are never shown here.
        </p>
      </div>

      {loading ? (
        <div className="document-status" role="status" aria-busy="true">
          <Loader2 className="spin" aria-hidden="true" /> Loading published documents…
        </div>
      ) : error ? (
        <div className="document-status error" role="alert">{error}</div>
      ) : items.length ? (
        <div className="doc-grid">
          {items.map((item) => {
            const previewUrl = `/api/resources/${item.id}/file`;
            const issueDate = formatIssueDate(item.issueDate);
            return (
              <article className="doc-card ds-interactive" key={item.id}>
                <DocumentThumbnail item={item} fileUrl={previewUrl} />
                <div className="doc-card-body">
                  <div className="doc-card-labels">
                    <span className="ds-badge" data-tone="neutral">{item.category || "Document"}</span>
                    {item.product && <span className="doc-product">{item.product}</span>}
                  </div>
                  <h3>{item.title}</h3>
                  <p className="doc-description">
                    {item.description || "Published Solarious company document."}
                  </p>
                  <dl className="doc-details">
                    {item.issuingOrganization && (
                      <div><dt>Issued by</dt><dd>{item.issuingOrganization}</dd></div>
                    )}
                    {issueDate && (
                      <div>
                        <dt><CalendarDays size={13} aria-hidden="true" /> Issue date</dt>
                        <dd><time dateTime={item.issueDate}>{issueDate}</time></dd>
                      </div>
                    )}
                    {item.certificateNumber && (
                      <div><dt>Reference</dt><dd>{item.certificateNumber}</dd></div>
                    )}
                    <div><dt>File</dt><dd>{item.file_name} · {megabytes(item.file_size)}</dd></div>
                  </dl>
                </div>
                <div className="doc-card-actions">
                  <button type="button" onClick={() => openPreview(item)} aria-label={`View ${item.title}`}>
                    <Eye size={16} aria-hidden="true" /> View
                  </button>
                  <a
                    href={`${previewUrl}?download=1`}
                    download={item.file_name}
                    aria-label={`Download ${item.title}`}
                  >
                    <Download size={16} aria-hidden="true" /> Download
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="document-empty">Published company documents will appear here.</p>
      )}

      <DocumentPreviewModal document={preview} onClose={closePreview} />
    </section>
  );
}
