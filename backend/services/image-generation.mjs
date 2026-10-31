import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getProvider, providerIds } from "./image-providers.mjs";

const maxBytes = 12 * 1024 * 1024;
const maxPromptLength = 4000;
const attempts = 3;

const failure = (message, code, status, details = {}) =>
  Object.assign(new Error(message), {
    code,
    status,
    stage: "image_generation",
    retryable: false,
    ...details,
  });

/**
 * Trim provider text so a leaked key can never reach a log line or an API error.
 * The configured credential is removed verbatim as a final guard, because some
 * providers echo the rejected key inside the error message.
 */
const redactKey = value => {
  const text = String(value || "");
  const key = process.env.IMAGE_API_KEY?.trim();
  const scrubbed = key && key.length >= 6 ? text.split(key).join("[redacted]") : text;
  return scrubbed
    .replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(api[_ -]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b(sk|rk|pk|stability)-[A-Za-z0-9_-]{6,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);
};

const clean = redactKey;

/**
 * Map an upstream HTTP status onto a stable, user-safe application error.
 * 4xx responses (except 408/429) are never retried — retrying an invalid
 * request or a missing credit balance only wastes quota.
 */
export const classifyProviderFailure = (status, extra = {}) => {
  const common = { provider: extra.provider || "image-provider", providerStatus: status, ...extra };
  if ([400, 422].includes(status))
    return failure("The image provider rejected the generation request.", "PROVIDER_INVALID_REQUEST", 400, common);
  if (status === 401)
    return failure("Image provider authentication failed.", "PROVIDER_AUTHENTICATION_ERROR", 401, common);
  if (status === 402)
    return failure("Image generation credits are unavailable.", "PROVIDER_PAYMENT_REQUIRED", 402, common);
  if (status === 403)
    return failure("The image provider denied this generation request.", "PROVIDER_PERMISSION_DENIED", 403, common);
  if (status === 413)
    return failure("The generated image exceeded the supported size.", "PROVIDER_RESPONSE_TOO_LARGE", 413, common);
  if ([408, 504].includes(status))
    return failure("Image generation timed out.", "PROVIDER_TIMEOUT", 504, { ...common, retryable: true });
  if (status === 429)
    return failure("The image provider rate limit was reached.", "PROVIDER_RATE_LIMITED", 429, {
      ...common,
      retryable: true,
    });
  return failure(
    "The image provider is temporarily unavailable.",
    "PROVIDER_UPSTREAM_ERROR",
    [500, 502, 503].includes(status) ? status : 502,
    { ...common, retryable: true },
  );
};

/**
 * Resolve the active provider from the environment. `capability` is
 * "text-to-image" only when the provider is known, the model belongs to it and
 * an API key is present — the admin UI uses this to disable the Generate button
 * instead of letting an admin discover the problem after a 30-second timeout.
 */
export const imageConfiguration = () => {
  const configuredProvider = (process.env.IMAGE_PROVIDER?.trim() || "").toLowerCase();
  const provider = getProvider(configuredProvider);
  const model = (process.env.IMAGE_MODEL?.trim() || provider?.defaultModel || "").toLowerCase();
  const hasKey = Boolean(process.env.IMAGE_API_KEY?.trim());
  return {
    provider: configuredProvider,
    providerLabel: provider?.label || "",
    configured: Boolean(configuredProvider && hasKey),
    model,
    supportedModels: provider?.models || [],
    supportedProviders: providerIds,
    capability: provider && provider.models.includes(model) ? "text-to-image" : "unsupported",
  };
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const retryDelay = (attempt, retryAfter) =>
  Number.isFinite(Number(retryAfter))
    ? Math.min(Number(retryAfter) * 1000, 10_000)
    : Math.min(800 * 2 ** (attempt - 1), 5_000);

const fallbackSizes = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920], "16:9": [1920, 1080] };

/** Opt-in offline placeholder used only when FESTIVAL_TEMPLATE_FALLBACK=true. */
const deterministicFallback = async aspectRatio => {
  const [width, height] = fallbackSizes[aspectRatio] || fallbackSizes["1:1"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061B36"/><stop offset="1" stop-color="#B07A12"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.round(width * 0.8)}" cy="${Math.round(height * 0.18)}" r="${Math.round(Math.min(width, height) * 0.1)}" fill="#F5B52E"/><path d="M0 ${Math.round(height * 0.72)} L${width} ${Math.round(height * 0.52)} V${height} H0Z" fill="#0B2C52"/><path d="M${Math.round(width * 0.1)} ${Math.round(height * 0.72)} L${Math.round(width * 0.7)} ${Math.round(height * 0.58)} L${Math.round(width * 0.84)} ${Math.round(height * 0.72)} L${Math.round(width * 0.24)} ${Math.round(height * 0.87)}Z" fill="#102A4C" stroke="#7CC6DD" stroke-width="${Math.max(3, Math.round(width * 0.004))}"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
};

/**
 * Generate one marketing image with the configured provider.
 *
 * @returns {Promise<{buffer:Buffer, provider:string, model:string, mimeType:string, requestId:string, providerRequestId:string}>}
 */
export async function generateMarketingImage({ prompt, aspectRatio = "1:1" } = {}) {
  const config = imageConfiguration();
  const requestId = randomUUID();
  const provider = getProvider(config.provider);

  if (!config.configured)
    throw failure("Image generation is not configured.", "IMAGE_PROVIDER_NOT_CONFIGURED", 503, {
      ...config,
      requestId,
    });
  if (!provider || config.capability !== "text-to-image")
    throw failure(
      "The configured provider or model does not support image generation.",
      "IMAGE_PROVIDER_CAPABILITY_UNSUPPORTED",
      503,
      { ...config, requestId },
    );
  if (!provider.aspectRatios.includes(aspectRatio))
    throw failure("The selected image aspect ratio is not supported.", "PROVIDER_INVALID_REQUEST", 400, {
      ...config,
      requestId,
    });
  const trimmed = String(prompt || "").trim();
  if (!trimmed || trimmed.length > maxPromptLength)
    throw failure("The image prompt is missing or too long.", "PROVIDER_INVALID_REQUEST", 400, {
      ...config,
      requestId,
    });

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);
    const started = Date.now();
    try {
      const outcome = await provider.resolve({
        prompt: trimmed,
        aspectRatio,
        model: config.model,
        apiKey: process.env.IMAGE_API_KEY,
        requestId,
        signal: controller.signal,
      });
      if (outcome.kind !== "ok") {
        throw classifyProviderFailure(outcome.status, {
          provider: provider.id,
          providerCode: outcome.providerCode,
          providerMessage: redactKey(outcome.providerMessage),
          providerRequestId: outcome.providerRequestId,
          clientRequestId: requestId,
          requestId: outcome.providerRequestId || requestId,
          durationMs: Date.now() - started,
          model: config.model,
          retryAfter: outcome.retryAfter,
          attempt,
        });
      }
      if (!outcome.buffer?.length)
        throw classifyProviderFailure(502, {
          provider: provider.id,
          providerCode: "EMPTY_IMAGE",
          requestId,
          durationMs: Date.now() - started,
          model: config.model,
          attempt,
        });
      if (outcome.buffer.length > maxBytes)
        throw classifyProviderFailure(413, {
          provider: provider.id,
          requestId,
          durationMs: Date.now() - started,
          model: config.model,
          attempt,
        });
      console.info("[image:provider:success]", {
        provider: provider.id,
        model: config.model,
        requestId,
        providerRequestId: outcome.providerRequestId,
        durationMs: Date.now() - started,
        attempt,
      });
      return {
        buffer: outcome.buffer,
        provider: provider.id,
        model: config.model,
        mimeType: outcome.contentType,
        requestId,
        providerRequestId: outcome.providerRequestId,
      };
    } catch (caught) {
      let error = caught;
      if (!error?.stage && error?.name === "AbortError")
        error = classifyProviderFailure(504, {
          provider: provider.id,
          model: config.model,
          requestId,
          durationMs: Date.now() - started,
          attempt,
        });
      else if (!error?.stage)
        error = failure("The image provider is temporarily unavailable.", "PROVIDER_UNAVAILABLE", 503, {
          provider: provider.id,
          model: config.model,
          requestId,
          retryable: true,
          durationMs: Date.now() - started,
          attempt,
        });
      console.error("[image:provider:error]", {
        provider: provider.id,
        model: config.model,
        status: error.status,
        code: error.code,
        requestId,
        attempt,
      });
      if (!error.retryable || attempt === attempts) {
        const fallbackAllowed = process.env.FESTIVAL_TEMPLATE_FALLBACK === "true" && error?.retryable === true;
        if (!fallbackAllowed) throw error;
        return {
          buffer: await deterministicFallback(aspectRatio),
          provider: "deterministic-template",
          model: "deterministic-fallback",
          mimeType: "image/jpeg",
          requestId,
          providerRequestId: "",
        };
      }
      await wait(retryDelay(attempt, error.retryAfter));
    } finally {
      clearTimeout(timeout);
    }
  }
  // Unreachable: the loop always returns or throws.
  throw failure("Image generation failed.", "PROVIDER_UNAVAILABLE", 503, { provider: provider.id, requestId });
}
