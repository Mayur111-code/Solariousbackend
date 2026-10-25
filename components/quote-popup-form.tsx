"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { apiError } from "@/lib/api-error";

const enquiryTypes = [
  "Residential solar",
  "Commercial rooftop",
  "Industrial solar",
  "Utility-scale project",
  "Solar module supply",
  "Technical consultation",
];

export default function QuotePopupForm() {
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
          details: { solarRequirement: values.solarRequirement },
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

  return (
    <form className="quote-popup-form" onSubmit={submit} noValidate={false}>
      <div className="quote-popup-fields">
        <label>
          Full name <span>*</span>
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Enter your name" />
        </label>
        <label>
          Company name
          <input name="company" maxLength={120} autoComplete="organization" placeholder="Enter company name" />
        </label>
        <label>
          Mobile number <span>*</span>
          <input name="phone" type="tel" required minLength={7} maxLength={22} autoComplete="tel" placeholder="+91 98765 43210" />
        </label>
        <label>
          Email address <span>*</span>
          <input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="you@company.com" />
        </label>
        <label>
          Enquiry type <span>*</span>
          <select name="enquiryType" required defaultValue="">
            <option value="" disabled>Select requirement</option>
            {enquiryTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          City / location <span>*</span>
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
      </div>
      {error && <p className="quote-popup-error" role="alert">{error}</p>}
      <button className="quote-popup-submit" type="submit" disabled={sending}>
        {sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
        {sending ? "Submitting…" : "Submit enquiry"}
      </button>
      <p className="quote-popup-consent">By submitting, you agree that Solarious may contact you about this enquiry.</p>
    </form>
  );
}
