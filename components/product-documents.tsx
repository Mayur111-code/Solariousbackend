import { Download, FileText } from "lucide-react";
import type { Product } from "@/data/site";

/**
 * Product datasheets and documents.
 *
 * These are the manufacturer's own published PDFs, so an explicit download is
 * permitted here (unlike the preview-only About Us reference documents). The
 * embedded `<object>` is the primary affordance; the anchor is the fallback.
 */
export default function ProductDocuments({ product }: { product: Product }) {
  const sheets = product.datasheets ?? [];

  return (
    <section className="product-documents" aria-labelledby="datasheet-heading">
      <div className="product-section-heading">
        <p className="premium-kicker">Documents</p>
        <h2 id="datasheet-heading">Datasheets &amp; technical documents</h2>
        <p>
          Original manufacturer PDFs, published without alteration. Confirm the correct model for
          your project with the technical team before specifying.
        </p>
      </div>

      {sheets.length ? (
        <div className="datasheet-grid">
          {sheets.map((sheet) => (
            <article className="datasheet-card" key={sheet.url}>
              <header>
                <span className="datasheet-icon">
                  <FileText size={18} aria-hidden="true" />
                </span>
                <div>
                  <span>{sheet.moduleType}</span>
                  <h3>{sheet.title}</h3>
                  <small>
                    PDF · {(sheet.fileSize / 1024 / 1024).toFixed(1)} MiB
                  </small>
                </div>
              </header>
              <div className="datasheet-preview">
                <object
                  data={`${sheet.url}#view=FitH&toolbar=0`}
                  type="application/pdf"
                  aria-label={`${sheet.title} preview`}
                >
                  <p>
                    PDF preview is unavailable in this browser.{" "}
                    <a href={sheet.url} target="_blank" rel="noreferrer">
                      Open the document
                    </a>
                    .
                  </p>
                </object>
              </div>
              <div className="datasheet-actions">
                <a
                  className="button button-ghost button-small"
                  href={sheet.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new tab
                </a>
                <a className="button button-small" href={sheet.url} download>
                  <Download size={15} aria-hidden="true" /> Download datasheet
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="document-empty">
          The approved datasheet for this module category is issued with the quotation. Request the
          current document set and the technical team will share the applicable model sheet.
        </p>
      )}
    </section>
  );
}
