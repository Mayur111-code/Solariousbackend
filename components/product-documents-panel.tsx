import { Download, ExternalLink, FileText } from "lucide-react";
import type { ProductDocument } from "@/data/product-catalog";

const formatSize = (bytes?: number) => {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "PDF";
  const mib = bytes / (1024 * 1024);
  return mib >= 1 ? `${mib.toFixed(1)} MiB` : `${Math.max(1, Math.round(bytes / 1024))} KiB`;
};

const KIND_LABEL: Record<NonNullable<ProductDocument["kind"]>, string> = {
  datasheet: "Datasheet",
  warranty: "Warranty",
  certificate: "Certificate",
  installation: "Installation",
};

export default function ProductDocumentsPanel({
  documents,
  name,
}: {
  documents: ProductDocument[];
  name: string;
}) {
  return (
    <section className="ps-section ps-documents" aria-labelledby="documents-heading" id="documents">
      <div className="ps-section-head">
        <p className="ps-kicker">Documents</p>
        <h2 id="documents-heading">Datasheet &amp; downloads</h2>
        <p>
          Original Solarious PDFs, served unchanged. Check the revision date and confirm the exact
          model with our technical team before specifying.
        </p>
      </div>

      {documents.length ? (
        <div className="ps-document-list">
          {documents.map((document) => (
            <article className="ps-document" key={`${document.url}-${document.title}`}>
              <div className="ps-document-main">
                <span className="ps-document-icon" aria-hidden="true">
                  <FileText size={18} />
                </span>
                <div>
                  <span className="ps-document-kind">
                    {KIND_LABEL[document.kind ?? "datasheet"]}
                  </span>
                  <h3>{document.title}</h3>
                  <p>
                    {name} · {formatSize(document.fileSize)}
                  </p>
                </div>
              </div>
              <div className="ps-document-actions">
                <a
                  className="ps-button ps-button-primary"
                  href={document.url}
                  download
                  aria-label={`Download ${document.title}`}
                >
                  <Download size={15} aria-hidden="true" /> Download
                </a>
                <a
                  className="ps-button ps-button-ghost"
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${document.title} in a new tab`}
                >
                  <ExternalLink size={15} aria-hidden="true" /> New tab
                </a>
              </div>
              <details className="ps-document-preview">
                <summary>Preview document</summary>
                <object data={`${document.url}#view=FitH`} type="application/pdf">
                  <p>
                    This browser cannot display the PDF inline.{" "}
                    <a href={document.url} target="_blank" rel="noreferrer">
                      Open the document in a new tab
                    </a>
                    .
                  </p>
                </object>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="ps-pending-card">
          <FileText size={20} aria-hidden="true" />
          <div>
            <strong>Datasheet not published yet</strong>
            <p>
              The approved PDF for {name} is being finalised. Request the current engineering
              package and we will share it as soon as it is released.
            </p>
            <a className="ps-button ps-button-primary" href="#enquiry">
              Request the datasheet
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
