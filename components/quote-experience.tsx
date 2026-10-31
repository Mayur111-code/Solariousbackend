"use client";

import { useState } from "react";
import { ClipboardList, MessagesSquare } from "lucide-react";
import QuotePopupForm from "@/components/quote-popup-form";
import RfqWizard from "@/components/rfq-wizard";

/**
 * The /quote page hosts both existing quote flows in one place:
 *   1. the unified enquiry form (the same component the "Get a quote" dialog
 *      uses, posting to /api/inquiries), and
 *   2. the commercial RFQ portal for utility-scale procurement (/api/rfqs).
 * Nothing is duplicated — this only switches which existing flow is visible.
 */
export default function QuoteExperience() {
  const [tab, setTab] = useState<"enquiry" | "rfq">("enquiry");

  return (
    <section className="quote-experience" aria-label="Request a quote">
      <div className="quote-tabs" role="tablist" aria-label="Quote request type">
        <button
          type="button"
          role="tab"
          id="quote-tab-enquiry"
          aria-selected={tab === "enquiry"}
          aria-controls="quote-panel-enquiry"
          className={tab === "enquiry" ? "active" : ""}
          onClick={() => setTab("enquiry")}
        >
          <MessagesSquare size={17} aria-hidden="true" />
          <span>
            <strong>Project enquiry</strong>
            <small>Residential, commercial and industrial quotes</small>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id="quote-tab-rfq"
          aria-selected={tab === "rfq"}
          aria-controls="quote-panel-rfq"
          className={tab === "rfq" ? "active" : ""}
          onClick={() => setTab("rfq")}
        >
          <ClipboardList size={17} aria-hidden="true" />
          <span>
            <strong>Commercial RFQ</strong>
            <small>Structured procurement for module supply</small>
          </span>
        </button>
      </div>

      <div
        className="quote-panel enquiry-panel"
        role="tabpanel"
        id="quote-panel-enquiry"
        aria-labelledby="quote-tab-enquiry"
        hidden={tab !== "enquiry"}
      >
        <div className="quote-panel-heading">
          <p className="eyebrow"><span /> Single enquiry form</p>
          <h2>Tell us about your project</h2>
          <p>
            One form covers rooftop, industrial and utility enquiries. Include your site
            location and capacity where known and our team will respond with a project-specific
            quotation.
          </p>
        </div>
        <QuotePopupForm variant="sectioned" />
      </div>

      <div
        className="quote-panel rfq-panel"
        role="tabpanel"
        id="quote-panel-rfq"
        aria-labelledby="quote-tab-rfq"
        hidden={tab !== "rfq"}
      >
        <RfqWizard />
      </div>
    </section>
  );
}
