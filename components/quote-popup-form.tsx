"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { apiError } from "@/lib/api-error";

/**
 * The single public enquiry form used by both the "Get a quote" dialog and the
 * /quote page. There is exactly one implementation and one backend endpoint
 * (`POST /api/inquiries`) — the `variant` prop only changes the layout.
 *
 * Required fields mirror the API contract: name, email, mobile, requirement and
 * location (plus a message for a general contact enquiry). Everything else is
 * optional detail stored in `details`.
 */

export const enquiryTypes = [
  "Residential solar",
  "Commercial rooftop",
  "Industrial solar",
  "Utility-scale project",
  "Solar module supply",
  "Technical consultation",
] as const;

const customerTypes = ["Homeowner", "Business", "Industrial plant", "EPC / developer", "Distributor"];
const projectTypes = ["New installation", "Expansion", "Replacement", "Module supply only", "Consultation"];

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-field-label">
      <span>{children}</span> <span className="required-mark" aria-hidden="true">*</span>
    </span>
  );
}

type Variant = "compact" | "sectioned";

export default function QuotePopupForm({ variant = "compact" }: { variant?: Variant }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submissionKey = useRef("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !event.currentTarget.reportValidity()) return;
    setSending(true);
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    // One idempotency key per form session: a double click or a retry can never
    // create a second enquiry record on the backend.
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey.current,
        },
        body: JSON.stringify({
          kind: "quote",
          name: values.name,
          company: values.company,
          email: values.email,
          phone: values.phone,
          product: values.enquiryType,
          capacity: values.capacity,
          location: values.location,
          message: values.message,
          details: {
            solarRequirement: values.solarRequirement,
            customerType: values.customerType,
            projectType: values.projectType,
            consent: values.consent === "on",
          },
        }),
      });
      if (!response.ok)
        throw await apiError(response, "Your quote request could not be submitted");
      setSent(true);
      form.reset();
      submissionKey.current = "";
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your quote request could not be submitted.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent)
    return (
      <div className="quote-popup-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h3>Thank you for your enquiry</h3>
        <p>Your request has been saved. A Solarious specialist will contact you shortly.</p>
        <button type="button" onClick={() => setSent(false)}>
          Submit another enquiry
        </button>
      </div>
    );

  const fields = (
    <>
      <label>
        <RequiredLabel>Full name</RequiredLabel>
        <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Enter your name" />
      </label>
      <label>
        Company name
        <input name="company" maxLength={120} autoComplete="organization" placeholder="Enter company name" />
      </label>
      <label>
        <RequiredLabel>Mobile number</RequiredLabel>
        <input name="phone" type="tel" required minLength={7} maxLength={22} autoComplete="tel" placeholder="+91 98765 43210" />
      </label>
      <label>
        <RequiredLabel>Email address</RequiredLabel>
        <input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="you@company.com" />
      </label>
      <label>
        <RequiredLabel>Enquiry type</RequiredLabel>
        <select name="enquiryType" required defaultValue="">
          <option value="" disabled>Select requirement</option>
          {enquiryTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <label>
        <RequiredLabel>City / location</RequiredLabel>
        <input name="location" required minLength={2} maxLength={120} autoComplete="address-level2" placeholder="Project location" />
      </label>
      <label>
        Solar requirement
        <input name="solarRequirement" maxLength={160} placeholder="Modules, rooftop system, EPC…" />
      </label>
      <label>
        Required capacity
        <input name="capacity" maxLength={60} placeholder="e.g. 500 kW" />
      </label>
      <label className="quote-popup-message">
        Message <small>Optional</small>
        <textarea name="message" rows={3} maxLength={1200} placeholder="Tell us about your project" />
      </label>
    </>
  );

  const consent = (
    <label className="enquiry-consent">
      <input type="checkbox" name="consent" required />
      <span>
        I agree that Solarious Energy may contact me about this enquiry. My details are used
        only to respond to it.
      </span>
    </label>
  );

  const submitButton = (
    <button className="quote-popup-submit" type="submit" disabled={sending}>
      {sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
      {sending ? "Submitting…" : "Submit enquiry"}
    </button>
  );

  /* Compact layout: the dialog. */
  if (variant === "compact")
    return (
      <form className="quote-popup-form" onSubmit={submit} noValidate={false}>
        <div className="quote-popup-fields">{fields}</div>
        {error && <p className="quote-popup-error" role="alert">{error}</p>}
        {submitButton}
        <p className="quote-popup-consent">
          By submitting, you agree that Solarious may contact you about this enquiry.
        </p>
      </form>
    );

  /* Sectioned layout: the /quote page. */
  return (
    <form className="quote-popup-form enquiry-form-sectioned" onSubmit={submit} noValidate={false}>
      <section className="enquiry-step" aria-labelledby="enquiry-contact-heading">
        <header>
          <span aria-hidden="true">A</span>
          <div>
            <h3 id="enquiry-contact-heading">Contact information</h3>
            <p>How our project team should reach you.</p>
          </div>
        </header>
        <div className="quote-popup-fields">
          <label>
            <RequiredLabel>Full name</RequiredLabel>
            <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Enter your name" />
          </label>
          <label>
            Company name
            <input name="company" maxLength={120} autoComplete="organization" placeholder="Optional for residential enquiries" />
          </label>
          <label>
            <RequiredLabel>Email address</RequiredLabel>
            <input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="you@company.com" />
          </label>
          <label>
            <RequiredLabel>Mobile number</RequiredLabel>
            <input name="phone" type="tel" required minLength={7} maxLength={22} autoComplete="tel" placeholder="+91 98765 43210" />
          </label>
        </div>
      </section>

      <section className="enquiry-step" aria-labelledby="enquiry-project-heading">
        <header>
          <span aria-hidden="true">B</span>
          <div>
            <h3 id="enquiry-project-heading">Project information</h3>
            <p>Where the system goes and what it needs to deliver.</p>
          </div>
        </header>
        <div className="quote-popup-fields">
          <label>
            <RequiredLabel>Enquiry type</RequiredLabel>
            <select name="enquiryType" required defaultValue="">
              <option value="" disabled>Select requirement</option>
              {enquiryTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Customer type
            <select name="customerType" defaultValue="">
              <option value="">Select customer type</option>
              {customerTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Project type
            <select name="projectType" defaultValue="">
              <option value="">Select project type</option>
              {projectTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <RequiredLabel>City / location</RequiredLabel>
            <input name="location" required minLength={2} maxLength={120} autoComplete="address-level2" placeholder="Installation city or site" />
          </label>
          <label>
            Required capacity
            <input name="capacity" maxLength={60} placeholder="e.g. 500 kW" />
          </label>
        </div>
      </section>

      <section className="enquiry-step" aria-labelledby="enquiry-requirement-heading">
        <header>
          <span aria-hidden="true">C</span>
          <div>
            <h3 id="enquiry-requirement-heading">Requirement details</h3>
            <p>Products, service scope or anything our team should know.</p>
          </div>
        </header>
        <div className="quote-popup-fields">
          <label className="quote-popup-message">
            Product or service requirement
            <input name="solarRequirement" maxLength={160} placeholder="Modules, rooftop system, EPC…" />
          </label>
          <label className="quote-popup-message">
            Message / additional information
            <textarea name="message" rows={4} maxLength={1200} placeholder="Tell us about your project, timelines or site conditions" />
          </label>
        </div>
      </section>

      <section className="enquiry-step" aria-labelledby="enquiry-submit-heading">
        <header>
          <span aria-hidden="true">D</span>
          <div>
            <h3 id="enquiry-submit-heading">Submit</h3>
            <p>Required fields are marked with an asterisk.</p>
          </div>
        </header>
        {consent}
        {error && <p className="quote-popup-error" role="alert">{error}</p>}
        {submitButton}
        <p className="enquiry-privacy">
          <ShieldCheck size={15} aria-hidden="true" />
          Your details are stored in the Solarious enquiry database and are never sold or used
          for unrelated marketing.
        </p>
      </section>
    </form>
  );
}
