// Shared RFQ option lists for the public form.
// These ids are the API contract validated by backend/services/rfq.mjs;
// tests/rfq-contract.test.mjs asserts the two lists stay identical.

export type RfqOption = { id: string; label: string };

export const RFQ_PROJECT_TYPES: RfqOption[] = [
  { id: "ci-rooftop", label: "C&I Rooftop" },
  { id: "ground-mount-open-access", label: "Ground-Mount / Open Access" },
  { id: "utility-tender", label: "Utility / SECI / DISCOM Tender" },
  { id: "oem-channel", label: "OEM / Channel Distribution" },
];

export const RFQ_VOLUME_TIERS: RfqOption[] = [
  { id: "under-100kw", label: "Below 100 kW" },
  { id: "100kw-500kw", label: "100 kW – 500 kW" },
  { id: "500kw-1mw", label: "500 kW – 1 MW" },
  { id: "1mw-5mw", label: "1 MW – 5 MW" },
  { id: "5mw-25mw", label: "5 MW – 25 MW" },
  { id: "25mw-plus", label: "25 MW+ Bulk Procurement" },
];

export const RFQ_MODULE_TECHNOLOGIES: RfqOption[] = [
  { id: "n-type-topcon", label: "N-Type TOPCon" },
  { id: "hjt", label: "HJT Heterojunction" },
  { id: "bifacial-dual-glass", label: "Bifacial Dual-Glass" },
  { id: "mono-perc", label: "Mono PERC Standard" },
];

export const RFQ_DISPATCH_TIMELINES: RfqOption[] = [
  { id: "immediate", label: "Immediate (<30 Days)" },
  { id: "60-90-days", label: "60–90 Days (Q1/Q2)" },
  { id: "planned-future", label: "Planned Future Cycle" },
  { id: "tender-contingent", label: "Contingent on Tender Award" },
];

/** High-priority threshold used for the reassurance note under the capacity field. */
export const HIGH_PRIORITY_TIERS = new Set(["1mw-5mw", "5mw-25mw", "25mw-plus"]);

export type RfqFormValues = {
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  gstin: string;
  designation: string;
  projectType: string;
  volumeTier: string;
  moduleTechnology: string;
  dispatchTimeline: string;
  specificationRequirements: string;
  projectNotes: string;
  country: string;
  state: string;
  city: string;
  site: string;
  privacyConsent: boolean;
};

export const emptyRfqForm: RfqFormValues = {
  fullName: "",
  workEmail: "",
  phone: "",
  companyName: "",
  gstin: "",
  designation: "",
  projectType: "",
  volumeTier: "",
  moduleTechnology: "",
  dispatchTimeline: "",
  specificationRequirements: "",
  projectNotes: "",
  country: "India",
  state: "",
  city: "",
  site: "",
  privacyConsent: false,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9]{7,15}$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type RfqFieldErrors = Partial<Record<keyof RfqFormValues | "privacyConsent", string>>;

/** Client-side mirror of the backend rules so users get immediate feedback. */
export function validateRfqStep(step: number, values: RfqFormValues): RfqFieldErrors {
  const errors: RfqFieldErrors = {};
  const phone = values.phone.replace(/[\s()\-.]/g, "");
  if (step === 0) {
    if (values.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!values.workEmail.trim()) errors.workEmail = "Enter your corporate work email.";
    else if (!EMAIL.test(values.workEmail.trim())) errors.workEmail = "Enter a valid email address.";
    if (!phone) errors.phone = "Enter a direct phone or WhatsApp number.";
    else if (!PHONE.test(phone)) errors.phone = "Enter 7 to 15 digits, optionally starting with +.";
    if (values.companyName.trim().length < 2) errors.companyName = "Enter the registered company name.";
    if (values.gstin.trim() && !GSTIN.test(values.gstin.trim().toUpperCase())) errors.gstin = "Enter a valid 15-character GSTIN or leave it blank.";
  }
  if (step === 1 && !values.projectType) errors.projectType = "Select an application category.";
  if (step === 2 && !values.volumeTier) errors.volumeTier = "Select a project capacity tier.";
  if (step === 3 && !values.moduleTechnology) errors.moduleTechnology = "Select a module technology.";
  if (step === 4 && !values.dispatchTimeline) errors.dispatchTimeline = "Select a deployment timeline.";
  if (step === 6) {
    if (values.country.trim().length < 2) errors.country = "Enter the project country.";
    if (values.state.trim().length < 2) errors.state = "Enter the state or region.";
    if (values.city.trim().length < 2) errors.city = "Enter the project city.";
  }
  if (step === 7 && !values.privacyConsent) errors.privacyConsent = "Please confirm the privacy consent before submitting.";
  return errors;
}

export const RFQ_STEP_LABELS = [
  "Your details",
  "Application",
  "Capacity",
  "Technology",
  "Timeline",
  "Technical",
  "Location",
  "Review",
];

export function rfqPayload(values: RfqFormValues) {
  return {
    fullName: values.fullName.trim(),
    workEmail: values.workEmail.trim(),
    phone: values.phone.trim(),
    companyName: values.companyName.trim(),
    gstin: values.gstin.trim().toUpperCase(),
    designation: values.designation.trim(),
    projectType: values.projectType,
    volumeTier: values.volumeTier,
    moduleTechnology: values.moduleTechnology,
    dispatchTimeline: values.dispatchTimeline,
    specificationRequirements: values.specificationRequirements.trim(),
    projectNotes: values.projectNotes.trim(),
    targetLocation: {
      country: values.country.trim(),
      state: values.state.trim(),
      city: values.city.trim(),
      site: values.site.trim(),
    },
    privacyConsent: values.privacyConsent,
  };
}
