"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";

export type EnquiryProductOption = {
  slug: string;
  name: string;
  wattages: { value: string; label: string }[];
};

const createKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `enquiry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function ProductEnquiryForm({
  products,
  currentSlug,
}: {
  products: EnquiryProductOption[];
  currentSlug: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [productSlug, setProductSlug] = useState(
    products.some((entry) => entry.slug === currentSlug) ? currentSlug : products[0]?.slug ?? "",
  );
  const [wattage, setWattage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const current = products.find((entry) => entry.slug === productSlug);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (String(data.get("website") ?? "")) return; // honeypot
    setState("sending");
    setError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createKey(),
        },
        body: JSON.stringify({
          kind: "quote",
          name: data.get("name"),
          company: data.get("company"),
          email: data.get("email"),
          phone: data.get("phone"),
          product: current?.name ?? productSlug,
          capacity: wattage || String(data.get("wattage") ?? ""),
          location: data.get("location"),
          message: data.get("message"),
          details: {
            source: "product-page",
            productSlug,
            wattage: wattage || null,
          },
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The enquiry could not be submitted.");
      setState("sent");
      form.reset();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === "AbortError"
          ? "The request timed out. Your details are still in the form — please retry."
          : cause instanceof Error
            ? cause.message
            : "The enquiry could not be submitted. Please retry.",
      );
      setState("idle");
    } finally {
      window.clearTimeout(timer);
    }
  }

  if (state === "sent") {
    return (
      <div className="ps-form-success" role="status">
        <CheckCircle2 size={34} aria-hidden="true" />
        <h3>Enquiry received</h3>
        <p>
          Our team will confirm module availability, datasheet revision and commercial terms for
          your project.
        </p>
        <button
          type="button"
          className="ps-button ps-button-ghost"
          onClick={() => {
            setState("idle");
            setWattage("");
            setError("");
          }}
        >
          <RotateCcw size={15} aria-hidden="true" /> Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form className="ps-enquiry-form" ref={formRef} onSubmit={submit} noValidate={false}>
      <div className="ps-form-grid">
        <label>
          <span>
            Full name <b aria-hidden="true">*</b>
          </span>
          <input name="name" required minLength={2} autoComplete="name" maxLength={100} />
        </label>
        <label>
          <span>
            Company <b aria-hidden="true">*</b>
          </span>
          <input name="company" required minLength={2} autoComplete="organization" maxLength={120} />
        </label>
        <label>
          <span>
            Work email <b aria-hidden="true">*</b>
          </span>
          <input type="email" name="email" required autoComplete="email" maxLength={160} />
        </label>
        <label>
          <span>
            Phone / mobile <b aria-hidden="true">*</b>
          </span>
          <input
            type="tel"
            name="phone"
            required
            minLength={7}
            maxLength={20}
            autoComplete="tel"
            pattern="[+0-9\s()-]{7,20}"
          />
        </label>
        <label>
          <span>
            Product <b aria-hidden="true">*</b>
          </span>
          <select
            name="product"
            value={productSlug}
            onChange={(event) => {
              setProductSlug(event.target.value);
              setWattage("");
            }}
            required
          >
            {products.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Wattage</span>
          <select
            name="wattage"
            value={wattage}
            onChange={(event) => setWattage(event.target.value)}
          >
            <option value="">Not sure yet</option>
            {(current?.wattages ?? []).map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="is-full">
          <span>
            Project location <b aria-hidden="true">*</b>
          </span>
          <input
            name="location"
            required
            minLength={2}
            maxLength={120}
            placeholder="City / state"
            autoComplete="address-level2"
          />
        </label>
        <label className="is-full">
          <span>
            Requirement <b aria-hidden="true">*</b>
          </span>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            maxLength={1200}
            placeholder="Capacity, mounting type, timeline and anything else we should know."
          />
        </label>
        <label className="ps-honeypot" aria-hidden="true">
          <span>Website</span>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error ? (
        <div className="ps-form-error" role="alert">
          <p>{error}</p>
          <button type="submit" className="ps-inline-retry">
            <RotateCcw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      ) : null}

      <div className="ps-form-actions">
        <button type="submit" className="ps-button ps-button-primary" disabled={state === "sending"}>
          {state === "sending" ? (
            <Loader2 size={16} className="spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {state === "sending" ? "Sending…" : "Send enquiry"}
        </button>
        <p>
          Your details are used only to respond to this enquiry. See our{" "}
          <a href="/privacy-policy">privacy policy</a>.
        </p>
      </div>
    </form>
  );
}
