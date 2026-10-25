import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProviderFailure,
  generateMarketingImage,
} from "./image-generation.mjs";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
  IMAGE_MODEL: process.env.IMAGE_MODEL,
  IMAGE_API_KEY: process.env.IMAGE_API_KEY,
};

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("classifies provider payment failures as non-retryable HTTP 402", () => {
  const error = classifyProviderFailure(402, {
    providerCode: "insufficient_credits",
  });
  assert.equal(error.status, 402);
  assert.equal(error.code, "PROVIDER_PAYMENT_REQUIRED");
  assert.equal(error.retryable, false);
  assert.equal(error.message, "Image generation credits are unavailable.");
});

test("preserves a sanitized Stability 402 without retrying or exposing the key", async () => {
  process.env.IMAGE_PROVIDER = "stability";
  process.env.IMAGE_MODEL = "core";
  process.env.IMAGE_API_KEY = "test-secret-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        code: "insufficient_credits",
        message: "API key=test-secret-key has insufficient credits",
      }),
      {
        status: 402,
        headers: {
          "content-type": "application/json",
          "x-request-id": "request-402",
        },
      },
    );
  const previousError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      generateMarketingImage({ prompt: "Solar festival greeting" }),
      error => {
        assert.equal(error.code, "PROVIDER_PAYMENT_REQUIRED");
        assert.equal(error.status, 402);
        assert.equal(error.retryable, false);
        assert.equal(error.requestId, "request-402");
        assert.doesNotMatch(String(error.providerMessage), /test-secret-key/);
        return true;
      },
    );
  } finally {
    console.error = previousError;
  }
});

test("sends the selected supported aspect ratio and accepts image bytes", async () => {
  process.env.IMAGE_PROVIDER = "stability";
  process.env.IMAGE_MODEL = "core";
  process.env.IMAGE_API_KEY = "test-key";
  let receivedAspectRatio = "";
  globalThis.fetch = async (_url, options) => {
    receivedAspectRatio = String(options.body.get("aspect_ratio"));
    return new Response(Uint8Array.from([82, 73, 70, 70]), {
      status: 200,
      headers: { "content-type": "image/webp" },
    });
  };
  const previousInfo = console.info;
  console.info = () => {};
  try {
    const image = await generateMarketingImage({
      prompt: "Solar festival greeting",
      aspectRatio: "9:16",
    });
    assert.equal(receivedAspectRatio, "9:16");
    assert.equal(image.provider, "stability");
    assert.equal(image.model, "core");
    assert.equal(image.buffer.length, 4);
  } finally {
    console.info = previousInfo;
  }
});

test("retries a transient rate limit once and keeps one client request id", async () => {
  process.env.IMAGE_PROVIDER = "stability";
  process.env.IMAGE_MODEL = "core";
  process.env.IMAGE_API_KEY = "test-key";
  const requestIds = [];
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    requestIds.push(options.headers["X-Client-Request-ID"]);
    if (calls === 1)
      return new Response(JSON.stringify({ message: "slow down" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "0" },
      });
    return new Response(Uint8Array.from([82, 73, 70, 70]), {
      status: 200,
      headers: { "content-type": "image/webp" },
    });
  };
  const previousError = console.error, previousInfo = console.info;
  console.error = () => {}; console.info = () => {};
  try {
    const image = await generateMarketingImage({ prompt: "Solar campaign" });
    assert.equal(calls, 2);
    assert.equal(requestIds[0], requestIds[1]);
    assert.equal(image.buffer.length, 4);
  } finally {
    console.error = previousError; console.info = previousInfo;
  }
});
