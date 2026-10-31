import { WHATSAPP_LABEL, WHATSAPP_URL } from "@/lib/contact";

export type HeroOverlayStrength = "light" | "medium" | "strong";
export type HeroAlignment = "left" | "center";
export type HeroBreadcrumbItem = { label: string; href?: string };
export type HeroCta = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  icon?: "arrow" | "none";
  external?: boolean;
  ariaLabel?: string;
};

/**
 * Presentation options shared by every public page hero. Page copy and any
 * dynamic imagery are supplied by the page itself.
 */
export type PublicHeroOptions = {
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  mobileImagePosition?: string;
  overlay?: HeroOverlayStrength;
  align?: HeroAlignment;
  compact?: boolean;
  breadcrumb?: string | HeroBreadcrumbItem[] | false;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  priority?: boolean;
};

export const DEFAULT_PUBLIC_HERO_IMAGE = "/hero-solar-1.webp";

/**
 * Verified local assets are reused with page-appropriate focal points. CMS and
 * product/event records can override `image` without changing the hero layout.
 */
export const PUBLIC_HERO_PRESETS = {
  about: {
    image: "/ai-solar-intelligence.webp",
    imageAlt: "Utility-scale solar array in front of a manufacturing campus",
    imagePosition: "center 58%",
    mobileImagePosition: "62% center",
    overlay: "strong",
    primaryCta: { label: "Explore Our Solutions", href: "/services", icon: "arrow" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },
  contact: {
    image: "/hero-solar-1.webp",
    imageAlt: "Solar modules beneath a sunset sky",
    imagePosition: "center 55%",
    mobileImagePosition: "68% center",
    overlay: "strong",
    primaryCta: { label: "Request a Quote", href: "/quote", icon: "arrow" },
    secondaryCta: {
      label: "Chat on WhatsApp",
      href: WHATSAPP_URL,
      external: true,
      ariaLabel: WHATSAPP_LABEL,
    },
  },
  services: {
    image: "/hero-solar-5.webp",
    imageAlt: "Commercial rooftop solar installation at sunset",
    imagePosition: "center 52%",
    mobileImagePosition: "65% center",
    overlay: "strong",
    primaryCta: { label: "Get a Quote", href: "/quote", icon: "arrow" },
    secondaryCta: { label: "Explore Products", href: "/products" },
  },
  products: {
    image: "/hero-solar-3.webp",
    imageAlt: "Close-up of high-efficiency solar photovoltaic modules",
    imagePosition: "center 50%",
    mobileImagePosition: "58% center",
    overlay: "medium",
    primaryCta: { label: "Request a Quote", href: "/quote", icon: "arrow" },
    secondaryCta: { label: "Compare Modules", href: "/compare" },
  },
  productDetail: {
    image: "/hero-solar-3.webp",
    imageAlt: "Solar module surface detail",
    imagePosition: "center 50%",
    mobileImagePosition: "58% center",
    overlay: "strong",
    compact: true,
    breadcrumb: [{ label: "Products", href: "/products" }],
  },
  gallery: {
    image: "/hero-solar-4.webp",
    imageAlt: "Aerial view of a large solar installation beside water",
    imagePosition: "center 48%",
    mobileImagePosition: "62% center",
    overlay: "medium",
    primaryCta: { label: "Explore Products", href: "/products", icon: "arrow" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },
  quality: {
    image: "/manufacturing-line.webp",
    imageAlt: "Solar module production and inspection equipment",
    imagePosition: "center 52%",
    mobileImagePosition: "58% center",
    overlay: "strong",
    primaryCta: { label: "Request a Quote", href: "/quote", icon: "arrow" },
    secondaryCta: { label: "Explore Products", href: "/products" },
  },
  sustainability: {
    image: "/hero-solar-1.webp",
    imageAlt: "Solar panels in a wide renewable-energy landscape",
    imagePosition: "center 55%",
    mobileImagePosition: "68% center",
    overlay: "strong",
    primaryCta: { label: "Explore Solutions", href: "/services", icon: "arrow" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },
  events: {
    image: "/hero-solar-2.webp",
    imageAlt: "Industrial rooftop solar installation",
    imagePosition: "center 52%",
    mobileImagePosition: "60% center",
    overlay: "medium",
    primaryCta: { label: "Contact Our Team", href: "/contact", icon: "arrow" },
  },
  eventDetail: {
    image: "/hero-solar-2.webp",
    imageAlt: "Industrial rooftop solar installation",
    imagePosition: "center 52%",
    mobileImagePosition: "60% center",
    overlay: "strong",
    compact: true,
    breadcrumb: [{ label: "Events", href: "/events" }],
    primaryCta: { label: "All Events", href: "/events", icon: "arrow" },
  },
  quote: {
    image: "/hero-solar-5.webp",
    imageAlt: "Commercial rooftop solar array",
    imagePosition: "center 52%",
    mobileImagePosition: "65% center",
    overlay: "strong",
    primaryCta: { label: "Contact Us", href: "/contact", icon: "arrow" },
  },
  compare: {
    image: "/hero-solar-3.webp",
    imageAlt: "Close-up of solar module technology",
    imagePosition: "center 50%",
    mobileImagePosition: "58% center",
    overlay: "strong",
    compact: true,
    primaryCta: { label: "Request Confirmed Specs", href: "/quote", icon: "arrow" },
  },
  solarRecommendation: {
    image: "/ai-solar-intelligence.webp",
    imageAlt: "Solar modules with digital energy intelligence graphics",
    imagePosition: "center 55%",
    mobileImagePosition: "62% center",
    overlay: "strong",
    compact: true,
    primaryCta: { label: "Get a Quote", href: "/quote", icon: "arrow" },
  },
  solarCalculator: {
    image: "/hero-solar-4.webp",
    imageAlt: "Aerial view of a utility-scale solar array",
    imagePosition: "center 48%",
    mobileImagePosition: "62% center",
    overlay: "strong",
    compact: true,
    primaryCta: { label: "Request Detailed Proposal", href: "/quote", icon: "arrow" },
  },
  moduleRecommender: {
    image: "/ai-solar-intelligence.webp",
    imageAlt: "Solar modules with digital energy intelligence graphics",
    imagePosition: "center 55%",
    mobileImagePosition: "62% center",
    overlay: "strong",
    compact: true,
    primaryCta: { label: "Discuss With Solar Engineer", href: "/quote", icon: "arrow" },
  },
  privacy: {
    image: "/hero-solar-1.webp",
    imageAlt: "Solar modules beneath a sunset sky",
    imagePosition: "center 55%",
    mobileImagePosition: "68% center",
    overlay: "strong",
    compact: true,
    align: "center",
  },
  terms: {
    image: "/hero-solar-1.webp",
    imageAlt: "Solar modules beneath a sunset sky",
    imagePosition: "center 55%",
    mobileImagePosition: "68% center",
    overlay: "strong",
    compact: true,
    align: "center",
  },
  notFound: {
    image: "/hero-solar-1.webp",
    imageAlt: "Solar modules beneath a sunset sky",
    imagePosition: "center 55%",
    mobileImagePosition: "68% center",
    overlay: "strong",
    compact: true,
    align: "center",
    breadcrumb: false,
    primaryCta: { label: "Return Home", href: "/", icon: "arrow" },
    secondaryCta: { label: "Contact Us", href: "/contact" },
  },
} satisfies Record<string, PublicHeroOptions>;

export type PublicHeroPresetKey = keyof typeof PUBLIC_HERO_PRESETS;
