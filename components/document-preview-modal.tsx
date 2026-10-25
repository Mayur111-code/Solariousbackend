"use client";

import { useEffect } from "react";
import { Download, ExternalLink, FileText, X } from "lucide-react";

export type DocumentPreview = {
  title: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
  downloadUrl?: string;
};

export default function DocumentPreviewModal({
  document,
  onClose,
}: {
  document: DocumentPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!document) return;
    const previousOverflow = window.document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [document, onClose]);

  if (!document) return null;
  const inlinePdf = document.fileType === "application/pdf";
  const inlineImage = ["image/jpeg", "image/png", "image/webp"].includes(
    document.fileType,
  );
  const downloadUrl = document.downloadUrl || document.previewUrl;

  return (
    <div className="document-viewer-backdrop" onMouseDown={onClose}>
      <section
        className="document-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-viewer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Document preview</span>
            <h2 id="document-viewer-title">{document.title}</h2>
            <small>{document.fileName}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Close document preview">
            <X />
          </button>
        </header>
        <div className="document-viewer-content">
          {inlinePdf ? (
            <object data={document.previewUrl} type="application/pdf">
              <div className="document-viewer-fallback">
                <FileText size={42} />
                <h3>This browser cannot display the PDF inline.</h3>
                <p>Open the document in a new tab or download it instead.</p>
              </div>
            </object>
          ) : inlineImage ? (
            // The URL is an authenticated same-origin document stream, not a
            // static image candidate for next/image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.previewUrl} alt={document.title} />
          ) : (
            <div className="document-viewer-fallback">
              <FileText size={48} />
              <h3>Preview is not available for this file type.</h3>
              <p>Use the open or download action to view it in a compatible application.</p>
            </div>
          )}
        </div>
        <footer>
          <a href={document.previewUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Open in new tab
          </a>
          <a className="primary" href={downloadUrl}>
            <Download size={16} /> Download
          </a>
        </footer>
      </section>
    </div>
  );
}
