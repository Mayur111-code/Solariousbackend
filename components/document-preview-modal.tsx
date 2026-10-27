"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
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
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!document) return;
    const previousOverflow = window.document.body.style.overflow;
    const previousFocus = window.document.activeElement as HTMLElement | null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeButton.current?.focus();
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
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
        aria-describedby="document-viewer-file"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Document preview</span>
            <h2 id="document-viewer-title">{document.title}</h2>
            <small id="document-viewer-file">{document.fileName}</small>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close document preview"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="document-viewer-content">
          {inlinePdf ? (
            <object
              data={document.previewUrl}
              type="application/pdf"
              aria-label={`${document.title} PDF preview`}
            >
              <div className="document-viewer-fallback">
                <FileText size={42} aria-hidden="true" />
                <h3>This browser cannot display the PDF inline.</h3>
                <p>Open the document in a new tab or download it instead.</p>
              </div>
            </object>
          ) : inlineImage ? (
            // The URL is an authenticated same-origin document stream, not a
            // static image candidate for next/image optimization.
            <img src={document.previewUrl} alt={`${document.title} document preview`} />
          ) : (
            <div className="document-viewer-fallback">
              <FileText size={48} aria-hidden="true" />
              <h3>Preview is not available for this file type.</h3>
              <p>Use the open or download action to view it in a compatible application.</p>
            </div>
          )}
        </div>
        <footer>
          <a href={document.previewUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> Open in new tab
          </a>
          <a
            className="primary"
            href={downloadUrl}
            download={document.fileName}
            aria-label={`Download ${document.title}`}
          >
            <Download size={16} aria-hidden="true" /> Download
          </a>
        </footer>
      </section>
    </div>
  );
}
