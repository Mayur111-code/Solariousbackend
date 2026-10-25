const validationError = message => Object.assign(new Error(message), { status: 400, stage: "validation", code: "INVALID_SITE_SETTING" });
const text = (value, maximum, label, required = false) => {
  const result = String(value ?? "").trim().replace(/\0/g, "").slice(0, maximum);
  if (required && !result) throw validationError(`${label} is required.`);
  return result;
};
const email = (value, label) => {
  const result = text(value, 160, label).toLowerCase();
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw validationError(`${label} must be a valid email address.`);
  return result;
};
const phone = (value, label) => {
  const result = text(value, 30, label);
  if (result && !/^\+?[0-9][0-9\s()-]{6,28}$/.test(result)) throw validationError(`${label} must be a valid phone number.`);
  return result;
};
const url = (value, label, { relative = false } = {}) => {
  const result = text(value, 800, label);
  if (!result) return "";
  if (relative && result.startsWith("/")) return result;
  try {
    const parsed = new URL(result);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw validationError(`${label} must be a valid HTTP(S) URL${relative ? " or site-relative path" : ""}.`);
  }
};
const boolean = (value, fallback = true) => typeof value === "boolean" ? value : fallback;
const array = (value, maximum, label) => {
  if (!Array.isArray(value)) throw validationError(`${label} must be a list.`);
  if (value.length > maximum) throw validationError(`${label} has too many entries.`);
  return value;
};

export const publicSiteSettingKeys = new Set(["aboutPage", "manufacturingPage", "branding", "seoSettings", "companyProfile"]);
export const editableSiteSettingKeys = new Set(publicSiteSettingKeys);

const pageSection = (item, index) => ({
  title: text(item?.title, 160, "Section title", true),
  text: text(item?.text, 5000, "Section content", true),
  imageUrl: url(item?.imageUrl, "Section image", { relative: true }),
  displayOrder: Number.isFinite(Number(item?.displayOrder)) ? Number(item.displayOrder) : index,
  published: boolean(item?.published),
});

const sanitizers = {
  companyProfile(input) {
    const social = input?.social && typeof input.social === "object" && !Array.isArray(input.social) ? input.social : {};
    return {
      companyName: text(input?.companyName, 160, "Company name", true),
      legalName: text(input?.legalName, 200, "Legal company name", true),
      tagline: text(input?.tagline, 240, "Tagline"),
      aboutHeading: text(input?.aboutHeading, 240, "About heading"),
      description: text(input?.description, 1200, "Company description", true),
      companyProfile: text(input?.companyProfile, 6000, "Company profile"),
      primaryPhone: phone(input?.primaryPhone, "Primary mobile number"),
      secondaryPhone: phone(input?.secondaryPhone, "Secondary mobile number"),
      whatsapp: phone(input?.whatsapp, "WhatsApp number"),
      generalEmail: email(input?.generalEmail, "General email"),
      salesEmail: email(input?.salesEmail, "Sales email"),
      purchaseEmail: email(input?.purchaseEmail, "Purchase email"),
      qcEmail: email(input?.qcEmail, "QC email"),
      factoryEmail: email(input?.factoryEmail, "Factory email"),
      registeredOffice: text(input?.registeredOffice, 1200, "Registered office"),
      factoryAddress: text(input?.factoryAddress, 1200, "Factory address"),
      officeContact: text(input?.officeContact, 800, "Office contact information"),
      website: text(input?.website, 160, "Website"),
      websiteUrl: url(input?.websiteUrl, "Website URL"),
      footerDescription: text(input?.footerDescription, 1200, "Footer description"),
      social: Object.fromEntries(["linkedin", "facebook", "instagram", "youtube", "x"].map(key => [key, url(social[key], `${key} URL`)])),
    };
  },
  seoSettings(input) {
    return {
      title: text(input?.title, 70, "SEO title", true),
      description: text(input?.description, 180, "Meta description", true),
      keywords: text(input?.keywords, 500, "Keywords"),
      canonicalUrl: url(input?.canonicalUrl, "Canonical URL"),
      ogTitle: text(input?.ogTitle, 100, "Open Graph title"),
      ogDescription: text(input?.ogDescription, 240, "Open Graph description"),
      ogImage: url(input?.ogImage, "Open Graph image", { relative: true }),
      robotsIndex: boolean(input?.robotsIndex),
      robotsFollow: boolean(input?.robotsFollow),
    };
  },
  aboutPage(input) {
    return {
      eyebrow: text(input?.eyebrow, 100, "About eyebrow"),
      title: text(input?.title, 240, "About title", true),
      intro: text(input?.intro, 2000, "About introduction", true),
      heroImage: url(input?.heroImage, "About hero image", { relative: true }),
      sections: array(input?.sections ?? [], 40, "About sections").map(pageSection),
      timeline: array(input?.timeline ?? [], 60, "Company timeline").map((item, index) => ({
        year: text(item?.year, 20, "Timeline year", true),
        title: text(item?.title, 160, "Timeline title", true),
        text: text(item?.text, 3000, "Timeline content", true),
        imageUrl: url(item?.imageUrl, "Timeline image", { relative: true }),
        displayOrder: Number.isFinite(Number(item?.displayOrder)) ? Number(item.displayOrder) : index,
        published: boolean(item?.published),
      })),
    };
  },
  manufacturingPage(input) {
    return {
      eyebrow: text(input?.eyebrow, 100, "Manufacturing eyebrow"),
      title: text(input?.title, 240, "Manufacturing title", true),
      intro: text(input?.intro, 2000, "Manufacturing introduction", true),
      heroImage: url(input?.heroImage, "Manufacturing hero image", { relative: true }),
      sections: array(input?.sections ?? [], 40, "Manufacturing sections").map(pageSection),
      steps: array(input?.steps ?? [], 40, "Manufacturing steps").map(item => ({
        title: text(item?.title, 160, "Process title", true),
        description: text(item?.description, 3000, "Process description"),
        imageUrl: url(item?.imageUrl, "Process image", { relative: true }),
        videoUrl: url(item?.videoUrl, "Process video", { relative: true }),
        published: boolean(item?.published),
      })),
    };
  },
  branding(input) {
    return {
      logoUrl: url(input?.logoUrl, "Primary logo", { relative: true }),
      alternateLogoUrl: url(input?.alternateLogoUrl, "Alternate logo", { relative: true }),
      footerLogoUrl: url(input?.footerLogoUrl, "Footer logo", { relative: true }),
      faviconUrl: url(input?.faviconUrl, "Favicon", { relative: true }),
      partnerLogoUrls: array(input?.partnerLogoUrls ?? [], 30, "Partner logos").map((value, index) => url(value, `Partner logo ${index + 1}`, { relative: true })),
    };
  },
};

export function sanitizeSiteSetting(key, input) {
  if (!editableSiteSettingKeys.has(key)) throw Object.assign(new Error("This website setting is not editable."), { status: 404, stage: "validation", code: "SITE_SETTING_NOT_FOUND" });
  if (!input || typeof input !== "object" || Array.isArray(input)) throw validationError("Settings must be a JSON object.");
  return sanitizers[key](input);
}
