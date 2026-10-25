// const defaultBaseUrl = "https://api.apinex.bond/v1";
// const defaultModel = "free/mimo-v2.6-pro";

// export const aiConfiguration = () => ({
//   configured: Boolean(process.env.APINEX_API_KEY?.trim()),
//   baseURL: (process.env.APINEX_BASE_URL?.trim() || defaultBaseUrl).replace(/\/+$/, ""),
//   model: process.env.APINEX_MODEL?.trim() || defaultModel,
// });

// const serviceError = (message, stage, status, details = {}) => Object.assign(new Error(message), { status, stage, ...details });

// const providerMessage = status => status === 401 ? "AI service authentication failed."
//   : status === 402 ? "AI service payment or credits are required."
//   : status === 403 ? "AI service access was denied."
//   : status === 404 ? "AI model or endpoint is unavailable."
//   : status === 429 ? "AI service quota or rate limit was reached."
//   : "AI service is temporarily unavailable.";

// export async function generateAIText(prompt, systemPrompt = "You are a professional Solarious Energy AI assistant.") {
//   const { configured, baseURL, model } = aiConfiguration();
//   if (!configured) throw serviceError("AI service is not configured.", "ai_configuration", 503);
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), 45_000);
//   try {
//     const response = await fetch(`${baseURL}/chat/completions`, {
//       method: "POST",
//       headers: { Authorization: `Bearer ${process.env.APINEX_API_KEY}`, "Content-Type": "application/json" },
//       body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.4 }),
//       signal: controller.signal,
//     });
//     const body = await response.json().catch(() => ({}));
//     if (!response.ok) {
//       const safeMessage = String(body?.error?.message || body?.message || "Provider request failed").slice(0, 300);
//       console.error("[ai:apinex:error]", { status: response.status, provider: "apinex", model, requestId: response.headers.get("x-request-id") || undefined, message: safeMessage });
//       const code = response.status === 401 ? "APINEX_AUTH_FAILED"
//         : response.status === 402 ? "APINEX_PAYMENT_REQUIRED"
//         : response.status === 403 ? "APINEX_ACCESS_DENIED"
//         : response.status === 404 ? "APINEX_MODEL_OR_ENDPOINT_NOT_FOUND"
//         : response.status === 429 ? "APINEX_RATE_LIMITED"
//         : response.status >= 500 ? "APINEX_UNAVAILABLE"
//         : "APINEX_REQUEST_FAILED";
//       throw serviceError(providerMessage(response.status), "ai_provider", response.status, { provider: "apinex", providerStatus: response.status, code });
//     }
//     const content = body?.choices?.[0]?.message?.content?.trim();
//     if (!content) throw serviceError("AI provider returned an empty response.", "ai_response", 502);
//     return content;
//   } catch (error) {
//     if (error?.stage) throw error;
//     if (error?.name === "AbortError") throw serviceError("AI service timed out.", "ai_provider", 504, { provider: "apinex" });
//     console.error("[ai:apinex:error]", { status: "network", provider: "apinex", model, message: String(error?.message || "Unknown provider error").slice(0, 300) });
//     throw serviceError("AI service is temporarily unavailable.", "ai_provider", 502, { provider: "apinex" });
//   } finally { clearTimeout(timeout); }
// }

// const parseJson = value => {
//   const candidate = String(value).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
//   try { return JSON.parse(candidate); } catch { throw serviceError("AI provider returned invalid marketing content.", "ai_response", 502); }
// };

// const fallbackCampaigns = [
//   { theme: "Residential Rooftop Solar", headline: "Power Your Home with the Sun", caption: "Choose reliable rooftop solar for everyday energy confidence and a more sustainable home.", hashtags: "#SolariousEnergy #RooftopSolar #SolarPower #CleanEnergy", scene: "a modern Indian family home with a premium rooftop solar installation" },
//   { theme: "Commercial Solar", headline: "Energy That Works as Hard as Your Business", caption: "Bring practical solar performance to commercial spaces with a solution planned for your energy goals.", hashtags: "#CommercialSolar #SolariousEnergy #BusinessEnergy #RenewableEnergy", scene: "a contemporary commercial building with a large, professionally installed rooftop solar array" },
//   { theme: "Industrial Solar", headline: "Built for Smarter Industrial Energy", caption: "Support long-term operational energy planning with a dependable industrial solar approach.", hashtags: "#IndustrialSolar #SolariousEnergy #CleanManufacturing #SolarPower", scene: "a clean industrial facility with an engineered rooftop solar installation" },
//   { theme: "Solar Savings", headline: "Make Every Ray Count", caption: "Explore how a carefully planned solar project can support more predictable energy decisions.", hashtags: "#SolarSavings #SolariousEnergy #SmartEnergy #SolarPower", scene: "a premium rooftop solar system in bright morning light, with a modern energy-conscious property" },
//   { theme: "Clean Energy", headline: "Choose a Brighter Energy Path", caption: "Solar energy helps organisations and homes move toward cleaner, resilient power.", hashtags: "#CleanEnergy #SolariousEnergy #RenewableFuture #SolarPower", scene: "a large clean solar farm beneath a clear blue sky with elegant grid infrastructure" },
//   { theme: "Sustainability", headline: "Progress Powered by the Sun", caption: "Build a lower-carbon future with solar solutions designed for practical projects.", hashtags: "#Sustainability #SolariousEnergy #GreenEnergy #RenewableEnergy", scene: "a sustainable business campus with solar panels, landscaping, and natural daylight" },
//   { theme: "Solar Technology", headline: "Technology Designed to Perform", caption: "Discover advanced solar module technologies for projects where dependable performance matters.", hashtags: "#SolarTechnology #SolariousEnergy #TOPCon #CleanEnergy", scene: "a precision close-up of high-efficiency solar modules in a premium manufacturing environment" },
//   { theme: "Renewable Energy Awareness", headline: "Tomorrow's Energy Starts Today", caption: "Solar is a practical step toward cleaner energy awareness for homes, businesses, and communities.", hashtags: "#RenewableEnergy #SolariousEnergy #EnergyAwareness #CleanEnergy", scene: "a broad renewable energy landscape with a modern solar installation at golden hour" },
//   { theme: "Government Solar Awareness", headline: "Explore Solar with Confidence", caption: "Understand your project requirements and speak with a trusted solar team before making decisions.", hashtags: "#SolarAwareness #SolariousEnergy #SolarPower #CleanEnergy", scene: "a professional solar consultation setting overlooking a completed rooftop solar project" },
// ];

// const fallbackIndex = (date, campaignType, recentConcepts) => {
//   const recentThemes = new Set(recentConcepts.slice(0, 14).map(item => String(item?.theme || "").toLowerCase()));
//   const input = `${date}|${campaignType}|${recentConcepts.length}`;
//   const offset = [...input].reduce((total, character) => total + character.charCodeAt(0), 0) % fallbackCampaigns.length;
//   for (let step = 0; step < fallbackCampaigns.length; step += 1) {
//     const index = (offset + step) % fallbackCampaigns.length;
//     if (!recentThemes.has(fallbackCampaigns[index].theme.toLowerCase())) return index;
//   }
//   return offset;
// };

// export function generateFallbackMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts = [] }) {
//   const campaign = fallbackCampaigns[fallbackIndex(date, campaignType, recentConcepts)];
//   return {
//     theme: campaign.theme,
//     headline: campaign.headline,
//     caption: campaign.caption,
//     cta: defaultCta || `Contact ${companyName || "Solarious Energy"} Today`,
//     hashtags: campaign.hashtags,
//     imagePrompt: `Professional photorealistic renewable-energy advertising photograph of ${campaign.scene}, realistic engineering details, clean natural lighting, refined corporate composition, sufficient negative space for Solarious post-production branding, no text, no logos, no watermark, no people, no phone numbers.`,
//     provider: "local_fallback",
//   };
// }

// const isRecoverableProviderFailure = error => (
//   error?.provider === "apinex" && [402, 429].includes(Number(error?.providerStatus || error?.status))
// ) || (
//   error?.stage === "ai_provider" && Number(error?.status) >= 500
// );

// export async function generateMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts = [] }) {
//   const recent = recentConcepts.length ? ` Recent themes and image prompts to avoid: ${JSON.stringify(recentConcepts.slice(0, 14))}. Do not repeat a substantially similar concept, location, building type, camera angle, time of day, composition, installation, background, or lighting.` : "";
//   const prompt = `Create one original ${companyName || "Solarious Energy"} solar marketing campaign for ${date}. Campaign focus: ${campaignType}. Return only JSON with string fields: theme, headline, caption, cta, hashtags, imagePrompt. Include practical residential, commercial, or industrial solar relevance as suitable. Use responsible language for subsidy, savings, and environmental topics; do not invent financial claims, government programs, or technical specifications. CTA default: ${defaultCta || "Contact Us Today"}. imagePrompt must describe a professional photorealistic 1080x1080 solar visual with no text, logos, people, watermarks, phone numbers, or fake data, with clear lower-area space reserved for post-production branding.${recent}`;
//   try {
//     const content = await generateAIText(prompt, "You are Solarious Energy's B2B marketing strategist. Return valid compact JSON only, without markdown.");
//     const value = parseJson(content);
//     for (const key of ["theme", "headline", "caption", "cta", "hashtags", "imagePrompt"]) if (!String(value?.[key] || "").trim()) throw serviceError("AI provider returned incomplete marketing content.", "ai_response", 502);
//     return { ...Object.fromEntries(["theme", "headline", "caption", "cta", "hashtags", "imagePrompt"].map(key => [key, String(value[key]).trim().slice(0, key === "caption" || key === "imagePrompt" ? 1200 : 300)])), provider: "apinex" };
//   } catch (error) {
//     if (!isRecoverableProviderFailure(error)) throw error;
//     console.warn("[marketing:content:fallback]", { provider: "apinex", status: error?.providerStatus || error?.status || "network", reason: error?.code || error?.stage || "provider_failure" });
//     return generateFallbackMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts });
//   }
// }



const defaultBaseUrl = "https://api.apinex.bond/v1";
const defaultModel = "free/mimo-v2.6-pro";

export const aiConfiguration = () => ({
  configured: Boolean(process.env.APINEX_API_KEY?.trim()),
  baseURL: (process.env.APINEX_BASE_URL?.trim() || defaultBaseUrl).replace(/\/+$/, ""),
  model: process.env.APINEX_MODEL?.trim() || defaultModel,
});

const serviceError = (message, stage, status, details = {}) => Object.assign(new Error(message), { status, stage, ...details });

const providerMessage = status => status === 401 ? "AI service authentication failed."
  : status === 402 ? "AI service payment or credits are required."
  : status === 403 ? "AI service access was denied."
  : status === 404 ? "AI model or endpoint is unavailable."
  : status === 429 ? "AI service quota or rate limit was reached."
  : "AI service is temporarily unavailable.";

export async function generateAIText(prompt, systemPrompt = "You are a professional Solarious Energy AI assistant.") {
  const { configured, baseURL, model } = aiConfiguration();
  if (!configured) throw serviceError("AI service is not configured.", "ai_configuration", 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.APINEX_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], temperature: 0.4 }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const safeMessage = String(body?.error?.message || body?.message || "Provider request failed").slice(0, 300);
      console.error("[ai:apinex:error]", { status: response.status, provider: "apinex", model, requestId: response.headers.get("x-request-id") || undefined, message: safeMessage });
      const code = response.status === 401 ? "APINEX_AUTH_FAILED"
        : response.status === 402 ? "APINEX_PAYMENT_REQUIRED"
        : response.status === 403 ? "APINEX_ACCESS_DENIED"
        : response.status === 404 ? "APINEX_MODEL_OR_ENDPOINT_NOT_FOUND"
        : response.status === 429 ? "APINEX_RATE_LIMITED"
        : response.status >= 500 ? "APINEX_UNAVAILABLE"
        : "APINEX_REQUEST_FAILED";
      throw serviceError(providerMessage(response.status), "ai_provider", response.status, { provider: "apinex", providerStatus: response.status, code });
    }
    const content = body?.choices?.[0]?.message?.content?.trim();
    if (!content) throw serviceError("AI provider returned an empty response.", "ai_response", 502);
    return content;
  } catch (error) {
    if (error?.stage) throw error;
    if (error?.name === "AbortError") throw serviceError("AI service timed out.", "ai_provider", 504, { provider: "apinex" });
    console.error("[ai:apinex:error]", { status: "network", provider: "apinex", model, message: String(error?.message || "Unknown provider error").slice(0, 300) });
    throw serviceError("AI service is temporarily unavailable.", "ai_provider", 502, { provider: "apinex" });
  } finally { clearTimeout(timeout); }
}

const parseJson = value => {
  const candidate = String(value).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(candidate); } catch { throw serviceError("AI provider returned invalid marketing content.", "ai_response", 502); }
};

const fallbackCampaigns = [
  { theme: "Residential Rooftop Solar", headline: "Power Your Home with the Sun", caption: "Choose reliable rooftop solar for everyday energy confidence and a more sustainable home.", hashtags: "#SolariousEnergy #RooftopSolar #SolarPower #CleanEnergy", scene: "a modern Indian family home with a premium rooftop solar installation" },
  { theme: "Commercial Solar", headline: "Energy That Works as Hard as Your Business", caption: "Bring practical solar performance to commercial spaces with a solution planned for your energy goals.", hashtags: "#CommercialSolar #SolariousEnergy #BusinessEnergy #RenewableEnergy", scene: "a contemporary commercial building with a large, professionally installed rooftop solar array" },
  { theme: "Industrial Solar", headline: "Built for Smarter Industrial Energy", caption: "Support long-term operational energy planning with a dependable industrial solar approach.", hashtags: "#IndustrialSolar #SolariousEnergy #CleanManufacturing #SolarPower", scene: "a clean industrial facility with an engineered rooftop solar installation" },
  { theme: "Solar Savings", headline: "Make Every Ray Count", caption: "Explore how a carefully planned solar project can support more predictable energy decisions.", hashtags: "#SolarSavings #SolariousEnergy #SmartEnergy #SolarPower", scene: "a premium rooftop solar system in bright morning light, with a modern energy-conscious property" },
  { theme: "Clean Energy", headline: "Choose a Brighter Energy Path", caption: "Solar energy helps organisations and homes move toward cleaner, resilient power.", hashtags: "#CleanEnergy #SolariousEnergy #RenewableFuture #SolarPower", scene: "a large clean solar farm beneath a clear blue sky with elegant grid infrastructure" },
  { theme: "Sustainability", headline: "Progress Powered by the Sun", caption: "Build a lower-carbon future with solar solutions designed for practical projects.", hashtags: "#Sustainability #SolariousEnergy #GreenEnergy #RenewableEnergy", scene: "a sustainable business campus with solar panels, landscaping, and natural daylight" },
  { theme: "Solar Technology", headline: "Technology Designed to Perform", caption: "Discover advanced solar module technologies for projects where dependable performance matters.", hashtags: "#SolarTechnology #SolariousEnergy #TOPCon #CleanEnergy", scene: "a precision close-up of high-efficiency solar modules in a premium manufacturing environment" },
  { theme: "Renewable Energy Awareness", headline: "Tomorrow's Energy Starts Today", caption: "Solar is a practical step toward cleaner energy awareness for homes, businesses, and communities.", hashtags: "#RenewableEnergy #SolariousEnergy #EnergyAwareness #CleanEnergy", scene: "a broad renewable energy landscape with a modern solar installation at golden hour" },
  { theme: "Government Solar Awareness", headline: "Explore Solar with Confidence", caption: "Understand your project requirements and speak with a trusted solar team before making decisions.", hashtags: "#SolarAwareness #SolariousEnergy #SolarPower #CleanEnergy", scene: "a professional solar consultation setting overlooking a completed rooftop solar project" },
];

const fallbackIndex = (date, campaignType, recentConcepts) => {
  const recentThemes = new Set(recentConcepts.slice(0, 14).map(item => String(item?.theme || "").toLowerCase()));
  const input = `${date}|${campaignType}|${recentConcepts.length}`;
  const offset = [...input].reduce((total, character) => total + character.charCodeAt(0), 0) % fallbackCampaigns.length;
  for (let step = 0; step < fallbackCampaigns.length; step += 1) {
    const index = (offset + step) % fallbackCampaigns.length;
    if (!recentThemes.has(fallbackCampaigns[index].theme.toLowerCase())) return index;
  }
  return offset;
};

export function generateFallbackMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts = [] }) {
  const campaign = fallbackCampaigns[fallbackIndex(date, campaignType, recentConcepts)];
  return {
    theme: campaign.theme,
    headline: campaign.headline,
    caption: campaign.caption,
    cta: defaultCta || `Contact ${companyName || "Solarious Energy"} Today`,
    hashtags: campaign.hashtags,
    imagePrompt: `Professional photorealistic renewable-energy advertising photograph of ${campaign.scene}, realistic engineering details, clean natural lighting, refined corporate composition, sufficient negative space for Solarious post-production branding, no text, no logos, no watermark, no people, no phone numbers.`,
    provider: "local_fallback",
  };
}

const isRecoverableProviderFailure = error => (
  error?.provider === "apinex" && [402, 429].includes(Number(error?.providerStatus || error?.status))
) || (
  error?.stage === "ai_provider" && Number(error?.status) >= 500
);

export async function generateMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts = [] }) {
  const recent = recentConcepts.length ? ` Recent themes and image prompts to avoid: ${JSON.stringify(recentConcepts.slice(0, 14))}. Do not repeat a substantially similar concept, location, building type, camera angle, time of day, composition, installation, background, or lighting.` : "";
  const prompt = `Create one original ${companyName || "Solarious Energy"} solar marketing campaign for ${date}. Campaign focus: ${campaignType}. Return only JSON with string fields: theme, headline, caption, cta, hashtags, imagePrompt. Include practical residential, commercial, or industrial solar relevance as suitable. Use responsible language for subsidy, savings, and environmental topics; do not invent financial claims, government programs, or technical specifications. CTA default: ${defaultCta || "Contact Us Today"}. imagePrompt must describe a professional photorealistic 1080x1080 solar visual with no text, logos, people, watermarks, phone numbers, or fake data, with clear lower-area space reserved for post-production branding.${recent}`;
  try {
    const content = await generateAIText(prompt, "You are Solarious Energy's B2B marketing strategist. Return valid compact JSON only, without markdown.");
    const value = parseJson(content);
    for (const key of ["theme", "headline", "caption", "cta", "hashtags", "imagePrompt"]) if (!String(value?.[key] || "").trim()) throw serviceError("AI provider returned incomplete marketing content.", "ai_response", 502);
    return { ...Object.fromEntries(["theme", "headline", "caption", "cta", "hashtags", "imagePrompt"].map(key => [key, String(value[key]).trim().slice(0, key === "caption" || key === "imagePrompt" ? 1200 : 300)])), provider: "apinex" };
  } catch (error) {
    if (!isRecoverableProviderFailure(error)) throw error;
    console.warn("[marketing:content:fallback]", { provider: "apinex", status: error?.providerStatus || error?.status || "network", reason: error?.code || error?.stage || "provider_failure" });
    return generateFallbackMarketingContent({ date, campaignType, companyName, defaultCta, recentConcepts });
  }
}
