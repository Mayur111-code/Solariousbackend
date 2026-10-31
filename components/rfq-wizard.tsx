"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  HIGH_PRIORITY_TIERS,
  RFQ_DISPATCH_TIMELINES,
  RFQ_MODULE_TECHNOLOGIES,
  RFQ_PROJECT_TYPES,
  RFQ_STEP_LABELS,
  RFQ_VOLUME_TIERS,
  emptyRfqForm,
  rfqPayload,
  validateRfqStep,
  type RfqFieldErrors,
  type RfqFormValues,
} from "@/lib/rfq-options";

type Submitted = {
  rfqReferenceId: string;
  companyName: string;
  fullName: string;
  workEmail: string;
  volumeTierLabel: string;
  moduleTechnologyLabel?: string;
  priority: string;
};

const labelOf = (options: { id: string; label: string }[], id: string) => options.find((option) => option.id === id)?.label ?? "—";

const newSubmissionKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rfq_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export default function RfqWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<RfqFormValues>(emptyRfqForm);
  const [errors, setErrors] = useState<RfqFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState("");
  // One idempotency key per form session: a double click or retry cannot create
  // a second RFQ, and the server still owns the official reference number.
  // Created lazily inside an event handler so render stays pure.
  const submissionKey = useRef<string>("");

  const setField = <K extends keyof RfqFormValues>(key: K, value: RfqFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  };

  const highPriority = useMemo(() => HIGH_PRIORITY_TIERS.has(values.volumeTier), [values.volumeTier]);
  const lastStep = RFQ_STEP_LABELS.length - 1;

  function advance() {
    const stepErrors = validateRfqStep(step, values);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((current) => Math.min(lastStep, current + 1));
  }

  async function submit() {
    const submissionErrors = { ...validateRfqStep(0, values), ...validateRfqStep(1, values), ...validateRfqStep(2, values), ...validateRfqStep(3, values), ...validateRfqStep(4, values), ...validateRfqStep(6, values), ...validateRfqStep(7, values) };
    if (Object.keys(submissionErrors).length) {
      setErrors(submissionErrors);
      const firstStep = [0, 1, 2, 3, 4, 6, 7].find((index) => Object.keys(validateRfqStep(index, values)).length);
      if (firstStep !== undefined) setStep(firstStep);
      return;
    }
    if (!submissionKey.current) submissionKey.current = newSubmissionKey();
    setSubmitting(true);
    setFormError("");
    try {
      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey.current },
        body: JSON.stringify(rfqPayload(values)),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body?.fields && typeof body.fields === "object") setErrors(body.fields as RfqFieldErrors);
        const fieldCount = body?.fields ? Object.keys(body.fields).length : 0;
        throw new Error(body?.error ? `${body.error}${fieldCount ? ` (${fieldCount} field${fieldCount === 1 ? "" : "s"} to review)` : ""}` : "Your RFQ could not be submitted. Please try again.");
      }
      if (body?.rfq) {
        setSubmitted(body.rfq as Submitted);
        if (body.duplicate) setDuplicateNotice(body.notice || "This RFQ was already received — our desk is reviewing it.");
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your RFQ could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="quote-success rfq-success" role="status">
        <CheckCircle2 size={44} />
        <h2>RFQ received — #{submitted.rfqReferenceId}</h2>
        {duplicateNotice ? <p className="rfq-duplicate-notice">{duplicateNotice}</p> : null}
        <p>
          Thank you, {submitted.fullName}. Your procurement inquiry for <strong>{submitted.companyName}</strong> has been
          logged against reference <strong>{submitted.rfqReferenceId}</strong>
          {submitted.priority === "High" ? " and flagged as high priority for the utility sales desk" : ""}. A dedicated
          key account manager will respond within 24 business hours.
        </p>
        <dl className="rfq-receipt">
          <div>
            <dt>Reference</dt>
            <dd>{submitted.rfqReferenceId}</dd>
          </div>
          <div>
            <dt>Capacity tier</dt>
            <dd>{submitted.volumeTierLabel}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{submitted.priority}</dd>
          </div>
          <div>
            <dt>Confirmation email</dt>
            <dd>{submitted.workEmail}</dd>
          </div>
        </dl>
        <p className="rfq-receipt-note">
          Keep this reference for correspondence. A copy of these details has been recorded with our procurement desk.
        </p>
        <div className="rfq-receipt-actions">
          <Link className="button" href="/products">
            Browse module specifications
          </Link>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setSubmitted(null);
              setDuplicateNotice("");
              setValues(emptyRfqForm);
              setStep(0);
              submissionKey.current = newSubmissionKey();
            }}
          >
            Submit another RFQ
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="quote-wizard rfq-wizard"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === lastStep) void submit();
        else advance();
      }}
      noValidate
    >
      <div className="step-bar rfq-step-bar" aria-label="RFQ progress">
        {RFQ_STEP_LABELS.map((label, index) => (
          <div className={index <= step ? "active" : ""} key={label} aria-current={index === step ? "step" : undefined}>
            <span>{index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className="wizard-panel">
        <p className="eyebrow">Step {step + 1} of {RFQ_STEP_LABELS.length}</p>
        <h2>{RFQ_STEP_LABELS[step]}</h2>

        {step === 0 ? (
          <div className="form-grid">
            <label>
              Full name *
              <input name="fullName" autoComplete="name" value={values.fullName} onChange={(event) => setField("fullName", event.target.value)} aria-invalid={Boolean(errors.fullName)} />
              {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
            </label>
            <label>
              Corporate work email *
              <input name="workEmail" type="email" autoComplete="email" value={values.workEmail} onChange={(event) => setField("workEmail", event.target.value)} aria-invalid={Boolean(errors.workEmail)} />
              {errors.workEmail ? <span className="field-error">{errors.workEmail}</span> : <span className="field-hint">Use your company address so we can verify the enquiry.</span>}
            </label>
            <label>
              Direct phone / WhatsApp *
              <input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={values.phone} onChange={(event) => setField("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} />
              {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
            </label>
            <label>
              Registered company name *
              <input name="companyName" autoComplete="organization" value={values.companyName} onChange={(event) => setField("companyName", event.target.value)} aria-invalid={Boolean(errors.companyName)} />
              {errors.companyName ? <span className="field-error">{errors.companyName}</span> : null}
            </label>
            <label>
              GSTIN (optional)
              <input name="gstin" maxLength={15} value={values.gstin} onChange={(event) => setField("gstin", event.target.value.toUpperCase())} aria-invalid={Boolean(errors.gstin)} />
              {errors.gstin ? <span className="field-error">{errors.gstin}</span> : null}
            </label>
            <label>
              Designation (optional)
              <input name="designation" autoComplete="organization-title" value={values.designation} onChange={(event) => setField("designation", event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form-grid">
            <label className="full">
              Application category *
              <select name="projectType" value={values.projectType} onChange={(event) => setField("projectType", event.target.value)} aria-invalid={Boolean(errors.projectType)}>
                <option value="">Select application category</option>
                {RFQ_PROJECT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {errors.projectType ? <span className="field-error">{errors.projectType}</span> : null}
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <label className="full">
              Project capacity *
              <select name="volumeTier" value={values.volumeTier} onChange={(event) => setField("volumeTier", event.target.value)} aria-invalid={Boolean(errors.volumeTier)}>
                <option value="">Select capacity tier</option>
                {RFQ_VOLUME_TIERS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {errors.volumeTier ? <span className="field-error">{errors.volumeTier}</span> : null}
            </label>
            {highPriority ? (
              <p className="full rfq-priority-note">
                <ShieldCheck size={16} /> Procurement requests of 1 MW and above are routed to our utility key account desk with a two-hour first-response target.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-grid">
            <label className="full">
              Module technology *
              <select name="moduleTechnology" value={values.moduleTechnology} onChange={(event) => setField("moduleTechnology", event.target.value)} aria-invalid={Boolean(errors.moduleTechnology)}>
                <option value="">Select module technology</option>
                {RFQ_MODULE_TECHNOLOGIES.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {errors.moduleTechnology ? <span className="field-error">{errors.moduleTechnology}</span> : null}
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-grid">
            <label className="full">
              Deployment timeline *
              <select name="dispatchTimeline" value={values.dispatchTimeline} onChange={(event) => setField("dispatchTimeline", event.target.value)} aria-invalid={Boolean(errors.dispatchTimeline)}>
                <option value="">Select deployment timeline</option>
                {RFQ_DISPATCH_TIMELINES.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              {errors.dispatchTimeline ? <span className="field-error">{errors.dispatchTimeline}</span> : null}
            </label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="form-grid">
            <label className="full">
              Technical requirements
              <textarea
                name="specificationRequirements"
                rows={6}
                maxLength={2000}
                placeholder={"Inverter voltage tolerance: 1500 V DC\nFrame dimensions: 2382 × 1134 × 35 mm\nCable / connector length: 400 mm with MC4\nCustom BoM or other engineering notes"}
                value={values.specificationRequirements}
                onChange={(event) => setField("specificationRequirements", event.target.value)}
              />
              <span className="field-hint">Optional. Include voltage tolerances, frame dimensions, cable lengths, BoM notes or other engineering requirements.</span>
            </label>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="form-grid">
            <label>
              Country *
              <input name="country" autoComplete="country-name" value={values.country} onChange={(event) => setField("country", event.target.value)} aria-invalid={Boolean(errors.country)} />
              {errors.country ? <span className="field-error">{errors.country}</span> : null}
            </label>
            <label>
              State / region *
              <input name="state" autoComplete="address-level1" value={values.state} onChange={(event) => setField("state", event.target.value)} aria-invalid={Boolean(errors.state)} />
              {errors.state ? <span className="field-error">{errors.state}</span> : null}
            </label>
            <label>
              City *
              <input name="city" autoComplete="address-level2" value={values.city} onChange={(event) => setField("city", event.target.value)} aria-invalid={Boolean(errors.city)} />
              {errors.city ? <span className="field-error">{errors.city}</span> : null}
            </label>
            <label>
              Project site
              <input name="site" placeholder="Site, park or survey reference" value={values.site} onChange={(event) => setField("site", event.target.value)} />
            </label>
            <label className="full">
              Additional project notes
              <textarea name="projectNotes" rows={3} maxLength={1000} value={values.projectNotes} onChange={(event) => setField("projectNotes", event.target.value)} />
              <span className="field-hint">Access, storage, transport or scheduling notes for this site.</span>
            </label>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="rfq-review">
            <p className="rfq-review-intro">Review your procurement request before submitting. The reference number is generated by our server when the RFQ is received.</p>
            <dl>
              <div><dt>Contact</dt><dd>{values.fullName} · {values.designation || "—"}</dd></div>
              <div><dt>Work email</dt><dd>{values.workEmail}</dd></div>
              <div><dt>Phone / WhatsApp</dt><dd>{values.phone}</dd></div>
              <div><dt>Company</dt><dd>{values.companyName}{values.gstin ? ` · GSTIN ${values.gstin}` : ""}</dd></div>
              <div><dt>Application</dt><dd>{labelOf(RFQ_PROJECT_TYPES, values.projectType)}</dd></div>
              <div><dt>Capacity tier</dt><dd>{labelOf(RFQ_VOLUME_TIERS, values.volumeTier)}</dd></div>
              <div><dt>Module technology</dt><dd>{labelOf(RFQ_MODULE_TECHNOLOGIES, values.moduleTechnology)}</dd></div>
              <div><dt>Timeline</dt><dd>{labelOf(RFQ_DISPATCH_TIMELINES, values.dispatchTimeline)}</dd></div>
              <div className="full"><dt>Project location</dt><dd>{[values.city, values.state, values.country].filter(Boolean).join(", ")}{values.site ? ` · ${values.site}` : ""}</dd></div>
              <div className="full"><dt>Technical requirements</dt><dd>{values.specificationRequirements || "Not provided"}</dd></div>
              {values.projectNotes ? <div className="full"><dt>Project notes</dt><dd>{values.projectNotes}</dd></div> : null}
            </dl>
            <label className="rfq-consent">
              <input type="checkbox" checked={values.privacyConsent} onChange={(event) => setField("privacyConsent", event.target.checked)} aria-invalid={Boolean(errors.privacyConsent)} />
              <span>
                I consent to Solarious Energy storing these project details and contacting me about this procurement inquiry.
                Details are handled per the{" "}
                <Link href="/privacy-policy" target="_blank">privacy policy</Link>.
              </span>
            </label>
            {errors.privacyConsent ? <span className="field-error">{errors.privacyConsent}</span> : null}
          </div>
        ) : null}

        {formError ? (
          <p className="form-error" role="alert">
            <AlertCircle size={16} /> {formError}
          </p>
        ) : null}

        <div className="wizard-actions">
          {step > 0 ? (
            <button type="button" className="button button-ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={submitting}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : null}
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={16} /> : null}
            {submitting ? "Submitting RFQ…" : step === lastStep ? "Submit RFQ" : "Continue"}
            {!submitting && step !== lastStep ? <ArrowRight size={16} /> : null}
          </button>
        </div>
      </div>
    </form>
  );
}
