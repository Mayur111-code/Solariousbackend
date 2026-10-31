/**
 * Single source of truth for AI Creative Studio options.
 *
 * The admin UI mirrors these values in `lib/creative-options.ts` and a contract
 * test asserts the two lists stay identical, so a new category can never be
 * offered by the interface while being rejected by the API (or vice versa).
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
  "Promotional Campaign"
];

/** Festival creatives remain a distinct campaign family with its own calendar. */
export const FESTIVAL_CATEGORY = "Festival Campaign";

export const ALL_CREATIVE_CATEGORIES = [FESTIVAL_CATEGORY, ...CREATIVE_CATEGORIES];

/** Legacy labels kept so existing creative records stay valid and filterable. */
export const LEGACY_CATEGORY_ALIASES = {
  Festival: FESTIVAL_CATEGORY,
  "Electricity Savings": "Residential Solar",
  Awareness: "Solar Awareness",
  "Product Promo": "Solar Panel Products"
};

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", note: "Square or portrait feed, story safe areas" },
  { id: "facebook", label: "Facebook", note: "Feed-first imagery with minimal fine print" },
  { id: "linkedin", label: "LinkedIn", note: "Corporate, engineering-led composition" },
  { id: "whatsapp", label: "WhatsApp", note: "Bold subject, high legibility at small size" }
];

export const PLATFORM_IDS = PLATFORMS.map(item => item.id);

export const LANGUAGES = ["English", "Hindi", "Marathi"];

export const ASPECT_RATIOS = {
  "1:1": { width: 1080, height: 1080, label: "Square 1080 x 1080" },
  "4:5": { width: 1080, height: 1350, label: "Portrait 1080 x 1350" },
  "9:16": { width: 1080, height: 1920, label: "Story 1080 x 1920" },
  "16:9": { width: 1920, height: 1080, label: "Landscape 1920 x 1080" }
};

export const ASPECT_RATIO_IDS = Object.keys(ASPECT_RATIOS);

/**
 * Review is a human decision and is deliberately separate from generation
 * status: a creative can be fully generated and still be unapproved.
 */
export const REVIEW_STATUSES = ["pending", "approved", "rejected"];

export const categoryLabel = value => LEGACY_CATEGORY_ALIASES[value] || value;

/**
 * Resolves a user-supplied label to a catalogue category, or "" when unknown.
 * Legacy aliases and legacy slugs ("residential-solar") are both accepted so
 * historical records keep working after the category list was extended.
 */
export const normaliseCategory = value => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (LEGACY_CATEGORY_ALIASES[text]) return LEGACY_CATEGORY_ALIASES[text];
  const lowered = text.toLowerCase();
  const exact = ALL_CREATIVE_CATEGORIES.find(item => item.toLowerCase() === lowered);
  if (exact) return exact;
  const slugged = lowered.replace(/[-_]+/g, " ");
  return (
    ALL_CREATIVE_CATEGORIES.find(
      item => item.toLowerCase().replace(/[-_]+/g, " ") === slugged
    ) || ""
  );
};

export const platformLabel = value =>
  PLATFORMS.find(item => item.id === value)?.label || "Instagram";

/** Audience hints pre-fill the admin form; the admin can always overwrite them. */
export const AUDIENCE_HINTS = {
  "Residential Solar": "Homeowners and housing societies",
  "Commercial Solar": "Business owners, facility managers and retailers",
  "Industrial Solar": "Factory owners, plant heads and energy managers",
  "Rooftop Solar": "Rooftop system buyers and EPC partners",
  "Solar Panel Products": "EPC procurement teams and distributors",
  "Mono PERC": "EPC engineers specifying established module technology",
  "TOPCon": "Utility and C&I developers pursuing higher yield",
  HJT: "Premium rooftop and space-constrained projects",
  "Bifacial Modules": "Ground-mounted and high-albedo site developers",
  Manufacturing: "Partners, suppliers and project developers",
  "Solar Awareness": "General public and first-time solar buyers",
  "Promotional Campaign": "Mixed B2B and B2C campaign audiences",
  [FESTIVAL_CATEGORY]: "Existing customers and business partners"
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
];
