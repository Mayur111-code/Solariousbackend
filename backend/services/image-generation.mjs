import { randomUUID } from "node:crypto";
import sharp from "sharp";

const provider = "stability";
const apiBase = "https://api.stability.ai/v2beta/stable-image/generate";
const supportedModels = new Set(["core", "ultra"]);
const supportedRatios = new Set(["1:1", "4:5", "16:9", "9:16"]);
const maxBytes = 12 * 1024 * 1024;

const failure = (message, code, status, details = {}) => Object.assign(new Error(message), {
  code, status, stage: "image_generation", retryable: false, ...details,
});
const clean = value => String(value || "").replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [redacted]").replace(/(api[_ -]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]").replace(/[\r\n\t]+/g, " ").slice(0, 300);
const details = async response => {
  const raw = await response.text().catch(() => "");
  try {
    const body = JSON.parse(raw);
    return { providerCode: String(body?.error?.code || body?.code || body?.name || "").slice(0, 80), providerMessage: clean(Array.isArray(body?.errors) ? body.errors.join("; ") : body?.error?.message || body?.message || body?.error || raw) };
  } catch { return { providerCode: "", providerMessage: clean(raw) }; }
};

export const classifyProviderFailure = (status, extra = {}) => {
  const common = { provider, providerStatus: status, ...extra };
  if ([400, 422].includes(status)) return failure("The image provider rejected the generation request.", "PROVIDER_INVALID_REQUEST", 400, common);
  if (status === 401) return failure("Image provider authentication failed.", "PROVIDER_AUTHENTICATION_ERROR", 401, common);
  if (status === 402) return failure("Image generation credits are unavailable.", "PROVIDER_PAYMENT_REQUIRED", 402, common);
  if (status === 403) return failure("The image provider denied this generation request.", "PROVIDER_PERMISSION_DENIED", 403, common);
  if (status === 413) return failure("The generated image exceeded the supported size.", "PROVIDER_RESPONSE_TOO_LARGE", 413, common);
  if ([408, 504].includes(status)) return failure("Image generation timed out.", "PROVIDER_TIMEOUT", 504, { ...common, retryable: true });
  if (status === 429) return failure("The image provider rate limit was reached.", "PROVIDER_RATE_LIMITED", 429, { ...common, retryable: true });
  return failure("The image provider is temporarily unavailable.", "PROVIDER_UPSTREAM_ERROR", [500, 502, 503].includes(status) ? status : 502, { ...common, retryable: true });
};

export const imageConfiguration = () => {
  const configuredProvider = (process.env.IMAGE_PROVIDER?.trim() || "").toLowerCase();
  const model = (process.env.IMAGE_MODEL?.trim() || "core").toLowerCase();
  return { provider: configuredProvider, configured: Boolean(configuredProvider && process.env.IMAGE_API_KEY?.trim()), model, capability: configuredProvider === provider && supportedModels.has(model) ? "text-to-image" : "unsupported" };
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const retryDelay = (attempt, retryAfter) => Number.isFinite(Number(retryAfter)) ? Math.min(Number(retryAfter) * 1000, 10_000) : Math.min(800 * 2 ** (attempt - 1), 5_000);
const fallbackSizes = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1920, 1080] };
const deterministicFallback = async aspectRatio => {
  const [width, height] = fallbackSizes[aspectRatio] || fallbackSizes["1:1"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061d33"/><stop offset="1" stop-color="#e97800"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.round(width*.8)}" cy="${Math.round(height*.18)}" r="${Math.round(Math.min(width,height)*.1)}" fill="#ffd77a"/><path d="M0 ${Math.round(height*.72)} L${width} ${Math.round(height*.52)} V${height} H0Z" fill="#063f4b"/><path d="M${Math.round(width*.1)} ${Math.round(height*.72)} L${Math.round(width*.7)} ${Math.round(height*.58)} L${Math.round(width*.84)} ${Math.round(height*.72)} L${Math.round(width*.24)} ${Math.round(height*.87)}Z" fill="#102d4a" stroke="#7cc6dd" stroke-width="${Math.max(3,Math.round(width*.004))}"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
};

export async function generateMarketingImage({ prompt, aspectRatio = "1:1" }) {
  const config = imageConfiguration();
  const requestId = randomUUID();
  if (!config.configured) throw failure("Image generation is not configured.", "IMAGE_PROVIDER_NOT_CONFIGURED", 503, { ...config, requestId });
  if (config.provider !== provider || config.capability !== "text-to-image") throw failure("The configured provider or model does not support image generation.", "IMAGE_PROVIDER_CAPABILITY_UNSUPPORTED", 503, { ...config, requestId });
  if (!supportedRatios.has(aspectRatio)) throw failure("The selected image aspect ratio is not supported.", "PROVIDER_INVALID_REQUEST", 400, { ...config, requestId });
  if (!String(prompt || "").trim() || String(prompt).length > 4000) throw failure("The image prompt is missing or too long.", "PROVIDER_INVALID_REQUEST", 400, { ...config, requestId });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const form = new FormData();
    form.set("prompt", prompt); form.set("output_format", "webp"); form.set("aspect_ratio", aspectRatio);
    form.set("negative_prompt", "text, words, letters, logo, watermark, phone number, distorted people, distorted solar panels");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);
    const started = Date.now();
    try {
      const response = await fetch(`${apiBase}/${config.model}`, { method: "POST", headers: { Authorization: `Bearer ${process.env.IMAGE_API_KEY}`, Accept: "image/*", "X-Client-Request-ID": requestId }, body: form, signal: controller.signal });
      const providerRequestId = clean(response.headers.get("x-request-id") || response.headers.get("stability-request-id"));
      const durationMs = Date.now() - started;
      if (!response.ok) throw classifyProviderFailure(response.status, { ...(await details(response)), clientRequestId:requestId, requestId:providerRequestId||requestId, providerRequestId, durationMs, model: config.model, retryAfter: response.headers.get("retry-after"), attempt });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) throw classifyProviderFailure(502, { providerCode: "INVALID_RESPONSE_TYPE", requestId, providerRequestId, durationMs, model: config.model, attempt });
      if (Number(response.headers.get("content-length") || 0) > maxBytes) throw classifyProviderFailure(413, { requestId, providerRequestId, durationMs, model: config.model, attempt });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) throw classifyProviderFailure(502, { providerCode: "EMPTY_IMAGE", requestId, providerRequestId, durationMs, model: config.model, attempt });
      if (buffer.length > maxBytes) throw classifyProviderFailure(413, { requestId, providerRequestId, durationMs, model: config.model, attempt });
      console.info("[image:provider:success]", { provider, model: config.model, requestId, providerRequestId, durationMs, attempt });
      return { buffer, provider, model: config.model, mimeType: contentType, requestId, providerRequestId };
    } catch (caught) {
      let error = caught;
      if (!error?.stage && error?.name === "AbortError") error = classifyProviderFailure(504, { model: config.model, requestId, durationMs: Date.now() - started, attempt });
      else if (!error?.stage) error = failure("The image provider is temporarily unavailable.", "PROVIDER_UNAVAILABLE", 503, { provider, model: config.model, requestId, retryable: true, durationMs: Date.now() - started, attempt });
      console.error("[image:provider:error]", { provider, model: config.model, status: error.status, code: error.code, requestId, attempt });
      if (!error.retryable || attempt === 3) {
        const fallbackAllowed = process.env.FESTIVAL_TEMPLATE_FALLBACK === "true" && error?.retryable === true;
        if (!fallbackAllowed) throw error;
        return { buffer: await deterministicFallback(aspectRatio), provider: "deterministic-template", model: "deterministic-fallback", mimeType: "image/jpeg", requestId };
      }
      await wait(retryDelay(attempt, error.retryAfter));
    } finally { clearTimeout(timeout); }
  }
}
