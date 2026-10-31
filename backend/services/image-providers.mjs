/**
 * Image-generation provider abstraction.
 *
 * Each provider normalises its own HTTP dialect into one shape so the admin
 * interface, the retry policy, the branding overlay and the storage layer never
 * need to know which vendor is configured:
 *
 *   resolve({ prompt, aspectRatio, model, apiKey, requestId, signal })
 *     → { kind: "ok", buffer, contentType, providerRequestId }
 *     → { kind: "error", status, providerCode, providerMessage, providerRequestId, retryAfter }
 *
 * Providers never throw for an HTTP failure; the orchestrator classifies and
 * decides whether a retry is safe. Network-level failures are reported as 503.
 *
 * Switching vendor is an environment change only:
 *   IMAGE_PROVIDER=stability|openai
 *   IMAGE_MODEL=core|ultra|gpt-image-1|dall-e-3
 *   IMAGE_API_KEY=...
 */

const cleanNote = value =>
  String(value || "")
    .replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(api[_ -]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    // Providers frequently echo the rejected credential in the error text,
    // e.g. "Incorrect API key provided: sk-…". Never let that through.
    .replace(/\b(sk|rk|pk|stability)-[A-Za-z0-9_-]{6,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);

const readError = async (response, pick) => {
  const raw = await response.text().catch(() => "");
  try {
    const body = JSON.parse(raw);
    return {
      providerCode: String(pick.code(body) || "").slice(0, 80),
      providerMessage: cleanNote(pick.message(body) || raw),
    };
  } catch {
    return { providerCode: "", providerMessage: cleanNote(raw) };
  }
};

/* -------------------------------------------------------------------------- */
/* Stability AI                                                               */
/* -------------------------------------------------------------------------- */
const STABILITY_BASE = "https://api.stability.ai/v2beta/stable-image/generate";

const stability = {
  id: "stability",
  label: "Stability AI",
  docs: "Stable Image Core / Ultra",
  models: ["core", "ultra"],
  defaultModel: "core",
  aspectRatios: ["1:1", "4:5", "16:9", "9:16"],
  async resolve({ prompt, aspectRatio, model, apiKey, requestId, signal }) {
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("output_format", "webp");
    form.set("aspect_ratio", aspectRatio);
    form.set(
      "negative_prompt",
      "text, words, letters, logo, watermark, phone number, distorted people, distorted solar panels",
    );
    let response;
    try {
      response = await fetch(`${STABILITY_BASE}/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
          "X-Client-Request-ID": requestId,
        },
        body: form,
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return { kind: "error", status: 503, providerCode: "", providerMessage: "Provider unreachable" };
    }
    const providerRequestId = cleanNote(
      response.headers.get("x-request-id") || response.headers.get("stability-request-id"),
    );
    if (!response.ok) {
      const details = await readError(response, {
        code: body => body?.error?.code || body?.code,
        message: body =>
          Array.isArray(body?.errors)
            ? body.errors.join("; ")
            : body?.error?.message || body?.message || body?.error,
      });
      return {
        kind: "error",
        status: response.status,
        ...details,
        providerRequestId,
        retryAfter: response.headers.get("retry-after"),
      };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return {
        kind: "error",
        status: 502,
        providerCode: "INVALID_RESPONSE_TYPE",
        providerMessage: "The provider returned a non-image response.",
        providerRequestId,
      };
    }
    if (Number(response.headers.get("content-length") || 0) > 12 * 1024 * 1024) {
      return {
        kind: "error",
        status: 413,
        providerCode: "RESPONSE_TOO_LARGE",
        providerMessage: "The provider image exceeded the supported size.",
        providerRequestId,
      };
    }
    return {
      kind: "ok",
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType,
      providerRequestId,
    };
  },
};

/* -------------------------------------------------------------------------- */
/* OpenAI Images                                                              */
/* -------------------------------------------------------------------------- */
const OPENAI_BASE = "https://api.openai.com/v1/images/generations";

const openAiSizes = {
  "gpt-image-1": { "1:1": "1024x1024", "4:5": "1024x1536", "9:16": "1024x1536", "16:9": "1536x1024" },
  "dall-e-3": { "1:1": "1024x1024", "4:5": "1024x1792", "9:16": "1024x1792", "16:9": "1792x1024" },
};

const openai = {
  id: "openai",
  label: "OpenAI Images",
  docs: "gpt-image-1 / dall-e-3",
  models: ["gpt-image-1", "dall-e-3"],
  defaultModel: "gpt-image-1",
  aspectRatios: ["1:1", "4:5", "16:9", "9:16"],
  async resolve({ prompt, aspectRatio, model, apiKey, signal }) {
    const size = openAiSizes[model]?.[aspectRatio] || "1024x1024";
    const payload = {
      model,
      prompt,
      n: 1,
      size,
      // gpt-image-1 always returns base64 and rejects this flag.
      ...(model === "dall-e-3" ? { response_format: "b64_json" } : {}),
    };
    let response;
    try {
      response = await fetch(OPENAI_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return { kind: "error", status: 503, providerCode: "", providerMessage: "Provider unreachable" };
    }
    const providerRequestId = cleanNote(
      response.headers.get("x-request-id") || response.headers.get("openai-request-id"),
    );
    if (!response.ok) {
      const parsed = await response.text().catch(() => "");
      let details = { providerCode: "", providerMessage: cleanNote(parsed) };
      try {
        const body = JSON.parse(parsed);
        details = {
          providerCode: String(body?.error?.code || body?.error?.type || "").slice(0, 80),
          providerMessage: cleanNote(body?.error?.message || parsed),
        };
      } catch {
        /* non-JSON body already captured */
      }
      return {
        kind: "error",
        status: response.status,
        ...details,
        providerRequestId,
        retryAfter: response.headers.get("retry-after"),
      };
    }
    const body = await response.json().catch(() => null);
    const encoded = body?.data?.[0]?.b64_json;
    if (!encoded) {
      return {
        kind: "error",
        status: 502,
        providerCode: "EMPTY_IMAGE",
        providerMessage: "The provider returned no image data.",
        providerRequestId,
      };
    }
    return {
      kind: "ok",
      buffer: Buffer.from(encoded, "base64"),
      contentType: "image/png",
      providerRequestId,
    };
  },
};

export const IMAGE_PROVIDERS = { stability, openai };

export const providerIds = Object.keys(IMAGE_PROVIDERS);

export const getProvider = id => IMAGE_PROVIDERS[String(id || "").toLowerCase()] || null;

/** Options the admin UI can display without knowing which vendor is active. */
export const providerCatalogue = () =>
  providerIds.map(id => {
    const provider = IMAGE_PROVIDERS[id];
    return {
      id: provider.id,
      label: provider.label,
      models: provider.models,
      aspectRatios: provider.aspectRatios,
    };
  });
