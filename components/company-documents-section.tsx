"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileCheck2, FileText, Loader2 } from "lucide-react";
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
  file_name: string;
  file_type: string;
  file_size: number;
};

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function CompanyDocumentsSection() {
  const [items, setItems] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);

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
        setError(cause instanceof Error ? cause.message : "Published documents could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

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
      className="company-documents"
      aria-labelledby="company-documents-title"
    >
      <div className="company-documents-heading">
        <div>
          <p className="eyebrow">Approved company records</p>
          <h2 id="company-documents-title">Company Documents &amp; Certifications</h2>
        </div>
        <p>
          Browse documents published by an authorised Solarious administrator.
          Draft and withdrawn files are never shown here.
        </p>
      </div>

      {loading ? (
        <div className="document-status" role="status">
          <Loader2 className="spin" /> Loading published documents…
        </div>
      ) : error ? (
        <div className="document-status error" role="alert">{error}</div>
      ) : items.length ? (
        <div className="company-document-grid">
          {items.map((item) => {
            const thumbnail = item.previewImageUrl || item.logoUrl;
            return (
              <article key={item.id}>
                <div className="company-document-thumbnail">
                  {thumbnail ? (
                    // Admin-managed Cloudinary thumbnails are loaded directly.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="" loading="lazy" />
                  ) : item.category === "Certificates" ? (
                    <FileCheck2 />
                  ) : (
                    <FileText />
                  )}
                </div>
                <div className="company-document-copy">
                  <span>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description || "Published Solarious company document."}</p>
                  <small>{item.file_name} · {megabytes(item.file_size)}</small>
                </div>
                <div className="company-document-actions">
                  <button type="button" onClick={() => openPreview(item)}>
                    <Eye size={16} /> Preview
                  </button>
                  <a href={`/api/resources/${item.id}/file?download=1`}>
                    <Download size={16} /> Download
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
