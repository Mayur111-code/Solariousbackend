/**
 * AI Creative Studio options (client mirror).
 *
 * These lists are asserted against `backend/services/creative-catalogue.mjs`
 * by `tests/creative-contract.test.mjs`, so the admin UI can never offer a
 * category, platform or aspect ratio that the API would reject.
 */

export const CREATIVE_CATEGORIES = [
  "Residential Solar",
  "Commercial Solar",
  "Industrial Solar",
  "Rooftop Solar",
  "Solar Panel Products",
  "Mono PERC",
  "TOPCon",
  "HJT",
  "Bifacial Modules",
  "Manufacturing",
  "Solar Awareness",
  "Promotional Campaign",
] as const;

export const FESTIVAL_CATEGORY = "Festival Campaign";

export const ALL_CREATIVE_CATEGORIES = [
  FESTIVAL_CATEGORY,
  ...CREATIVE_CATEGORIES,
] as const;

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", note: "Square or portrait feed, story safe areas" },
  { id: "facebook", label: "Facebook", note: "Feed-first imagery with minimal fine print" },
  { id: "linkedin", label: "LinkedIn", note: "Corporate, engineering-led composition" },
  { id: "whatsapp", label: "WhatsApp", note: "Bold subject, high legibility at small size" },
] as const;

export const PLATFORM_IDS = PLATFORMS.map(platform => platform.id);

export const LANGUAGES = ["English", "Hindi", "Marathi"] as const;

export const ASPECT_RATIOS = [
  { id: "1:1", label: "Square · 1080 × 1080" },
  { id: "4:5", label: "Portrait · 1080 × 1350" },
  { id: "9:16", label: "Story · 1080 × 1920" },
  { id: "16:9", label: "Landscape · 1920 × 1080" },
] as const;

export const ASPECT_RATIO_IDS = ASPECT_RATIOS.map(ratio => ratio.id);

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const AUDIENCE_HINTS: Record<string, string> = {
  "Residential Solar": "Homeowners and housing societies",
  "Commercial Solar": "Business owners, facility managers and retailers",
  "Industrial Solar": "Factory owners, plant heads and energy managers",
  "Rooftop Solar": "Rooftop system buyers and EPC partners",
  "Solar Panel Products": "EPC procurement teams and distributors",
  "Mono PERC": "EPC engineers specifying established module technology",
  TOPCon: "Utility and C&I developers pursuing higher yield",
  HJT: "Premium rooftop and space-constrained projects",
  "Bifacial Modules": "Ground-mounted and high-albedo site developers",
  Manufacturing: "Partners, suppliers and project developers",
  "Solar Awareness": "General public and first-time solar buyers",
  "Promotional Campaign": "Mixed B2B and B2C campaign audiences",
  [FESTIVAL_CATEGORY]: "Existing customers and business partners",
};

export const FESTIVAL_OCCASIONS = [
  "Republic Day",
  "Independence Day",
  "Gandhi Jayanti",
  "Diwali",
  "Dussehra",
  "Ganesh Chaturthi",
  "Holi",
  "Gudi Padwa",
  "Makar Sankranti",
  "Raksha Bandhan",
  "Christmas",
  "New Year",
  "Maharashtra Day",
  "Labour Day",
  "Company Anniversary",
  "Custom Occasion",
] as const;

export const isCatalogueCategory = (value: string): boolean =>
  (ALL_CREATIVE_CATEGORIES as readonly string[]).includes(value);
