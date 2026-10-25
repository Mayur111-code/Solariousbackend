import "server-only";
import { backendApiUrl } from "@/lib/server-config";
import { manufacturingSteps, pageContent } from "@/data/site";

export type CmsSection = { title: string; text: string; imageUrl?: string; displayOrder?: number; published?: boolean };
export type TimelineItem = {
  year: string;
  title: string;
  text: string;
  imageUrl: string;
  displayOrder: number;
  published: boolean;
};
export type ManufacturingStep = {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  published: boolean;
};
export type AboutCms = {
  eyebrow: string;
  title: string;
  intro: string;
  heroImage: string;
  sections: CmsSection[];
  timeline: TimelineItem[];
};
export type ManufacturingCms = {
  eyebrow: string;
  title: string;
  intro: string;
  heroImage: string;
  sections: CmsSection[];
  steps: ManufacturingStep[];
};
export type SiteLocation = {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  primary: boolean;
  active: boolean;
  verificationStatus: "pending" | "verified";
  displayOrder: number;
};
export type BrandingCms = {
  logoUrl: string;
  alternateLogoUrl: string;
  footerLogoUrl: string;
  faviconUrl: string;
  partnerLogoUrls: string[];
};
export type CompanyCms = {
  companyName: string;
  legalName: string;
  tagline: string;
  aboutHeading: string;
  description: string;
  companyProfile: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsapp: string;
  generalEmail: string;
  salesEmail: string;
  purchaseEmail: string;
  qcEmail: string;
  factoryEmail: string;
  registeredOffice: string;
  factoryAddress: string;
  officeContact: string;
  website: string;
  websiteUrl: string;
  footerDescription: string;
  social: { linkedin: string; facebook: string; instagram: string; youtube: string; x: string };
};
export type SeoCms={title:string;description:string;keywords:string;canonicalUrl:string;ogTitle:string;ogDescription:string;ogImage:string;robotsIndex:boolean;robotsFollow:boolean};

export const defaultAboutCms: AboutCms = {
  eyebrow: pageContent.about.eyebrow,
  title: pageContent.about.title,
  intro: pageContent.about.intro,
  heroImage: "/manufacturing-line.webp",
  sections: pageContent.about.sections.map(([title, text]) => ({
    title,
    text,
  })),
  timeline: [],
};
export const defaultManufacturingCms: ManufacturingCms = {
  eyebrow: pageContent.manufacturing.eyebrow,
  title: "Precision Manufacturing. Powering Tomorrow.",
  intro: pageContent.manufacturing.intro,
  heroImage: "/manufacturing-line.webp",
  sections: pageContent.manufacturing.sections.map(([title, text]) => ({
    title,
    text,
  })),
  steps: manufacturingSteps.map((title) => ({
    title,
    description: "Stage details are pending company confirmation.",
    imageUrl: "",
    videoUrl: "",
    published: true,
  })),
};
export const defaultLocation: SiteLocation = {
  name: "Mayureshwar Solar Energy Pvt Ltd",
  address: "4Q7X+4QP, Babhalde, Dhule, Maharashtra, India",
  latitude: 21.112265,
  longitude: 74.798172,
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=21.112265%2C74.798172",
  primary: true,
  active: true,
  verificationStatus: "pending",
  displayOrder: 0,
};
export const defaultBrandingCms: BrandingCms = {
  logoUrl: "/solarious-logo.png",
  alternateLogoUrl: "/solarious-logo.png",
  footerLogoUrl: "/solarious-logo.png",
  faviconUrl: "/favicon.svg",
  partnerLogoUrls: [],
};
export const defaultCompanyCms: CompanyCms = {
  companyName: "Solarious Energy",
  legalName: "Mayureshwar Solar Energy Pvt Ltd",
  tagline: "Clean Energy.. Pure World!",
  aboutHeading: "Powering India’s Solar Future",
  description: "Solar module manufacturing and engineering support for commercial, industrial and utility-scale applications.",
  companyProfile: "Solarious Energy brings manufacturing discipline, product technology and project-focused support together for the evolving solar industry.",
  primaryPhone: "",
  secondaryPhone: "",
  whatsapp: "",
  generalEmail: "info@solariousenergy.in",
  salesEmail: "",
  purchaseEmail: "",
  qcEmail: "",
  factoryEmail: "",
  registeredOffice: "Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",
  factoryAddress: "Plot No. T 3/4, MIDC Nardana Phase 2, Bhabalde Nardana, Dhule, Maharashtra – 425404, India",
  officeContact: "",
  website: "www.solariousenergy.com",
  websiteUrl: "https://www.solariousenergy.com",
  footerDescription: "Solar module manufacturing and engineering support for commercial, industrial and utility-scale applications.",
  social: { linkedin: "", facebook: "", instagram: "", youtube: "", x: "" },
};
export const defaultSeoCms:SeoCms={title:"Solarious Energy | Solar Modules for Every Project",description:"Explore Solarious Energy solar module technologies, manufacturing capabilities and project support.",keywords:"solar energy, solar modules, renewable energy",canonicalUrl:"https://www.solariousenergy.com",ogTitle:"Solarious Energy",ogDescription:"Solar modules, manufacturing and project-focused engineering support.",ogImage:"/solarious-logo.png",robotsIndex:true,robotsFollow:true};

async function setting<T>(key: string, fallback: T): Promise<T> {
  try {
    const backend = backendApiUrl();
    if (!backend) return fallback;
    const response = await fetch(`${backend}/api/site-settings/${key}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as { value?: T };
    return data.value && typeof data.value === "object"
      ? { ...fallback, ...data.value }
      : fallback;
  } catch {
    return fallback;
  }
}
export async function getAboutCms() {
  const value = await setting<AboutCms>("aboutPage", defaultAboutCms);
  return {
    ...value,
    sections:(Array.isArray(value.sections)?value.sections:[]).map((item,index)=>({...item,imageUrl:item.imageUrl||"",displayOrder:item.displayOrder??index,published:item.published!==false})).filter(item=>item.published).sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0)),
    timeline: (Array.isArray(value.timeline) ? value.timeline : [])
      .map((item, index) => ({
        ...item,
        imageUrl: item.imageUrl || "",
        displayOrder: Number(item.displayOrder) || index,
        published: item.published !== false,
      }))
      .filter((item) => item.published)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
}
export async function getManufacturingCms() {
  const value = await setting<ManufacturingCms>(
    "manufacturingPage",
    defaultManufacturingCms,
  );
  return {
    ...value,
    steps: (Array.isArray(value.steps) ? value.steps : [])
      .map((step) =>
        typeof step === "string"
          ? {
              title: step,
              description: "Stage details are pending company confirmation.",
              imageUrl: "",
              videoUrl: "",
              published: true,
            }
          : step,
      )
      .filter((step) => step.published !== false),
  };
}
export const getBrandingCms = () => setting("branding", defaultBrandingCms);
export const getSeoCms=()=>setting("seoSettings",defaultSeoCms);
export async function getCompanyCms(): Promise<CompanyCms> {
  const value = await setting<CompanyCms>("companyProfile", defaultCompanyCms);
  return { ...defaultCompanyCms, ...value, social: { ...defaultCompanyCms.social, ...(value.social || {}) } };
}
export async function getLocations(): Promise<SiteLocation[]> {
  try {
    const backend = backendApiUrl();
    if (!backend) return [defaultLocation];
    const response = await fetch(`${backend}/api/locations`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [defaultLocation];
    const data = (await response.json()) as { locations?: SiteLocation[] };
    return Array.isArray(data.locations) && data.locations.length
      ? data.locations
      : [defaultLocation];
  } catch {
    return [defaultLocation];
  }
}
