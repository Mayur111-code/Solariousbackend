import assert from "node:assert/strict";
import test from "node:test";
import { providerCatalogue, providerIds } from "./image-providers.mjs";
import { generateMarketingImage, imageConfiguration } from "./image-generation.mjs";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
  IMAGE_MODEL: process.env.IMAGE_MODEL,
  IMAGE_API_KEY: process.env.IMAGE_API_KEY,
};

const restoreEnvironment = () => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

test.afterEach(restoreEnvironment);

test("the provider catalogue is discoverable without exposing credentials", () => {
  const catalogue = providerCatalogue();
  assert.deepEqual(
    catalogue.map(item => item.id),
    providerIds,
  );
  assert.ok(catalogue.some(item => item.id === "stability"));
  assert.ok(catalogue.some(item => item.id === "openai"));
  for (const item of catalogue) {
    assert.ok(item.models.length > 0);
    assert.ok(item.aspectRatios.includes("1:1"));
    assert.equal(JSON.stringify(item).includes("apiKey"), false);
  }
});

test("configuration reports an unsupported model instead of guessing", () => {
  process.env.IMAGE_PROVIDER = "openai";
  process.env.IMAGE_MODEL = "not-a-real-model";
  process.env.IMAGE_API_KEY = "test-key";
  const config = imageConfiguration();
  assert.equal(config.capability, "unsupported");
  // A mismatched provider/model pair must never look ready for a request.
  assert.equal(config.configured, false);
});

test("configuration is not considered ready without an API key", () => {
  process.env.IMAGE_PROVIDER = "stability";
  process.env.IMAGE_MODEL = "core";
  delete process.env.IMAGE_API_KEY;
  const config = imageConfiguration();
  assert.equal(config.configured, false);
  assert.equal(config.capability, "text-to-image");
});

test("an unknown provider is rejected before any network call", async () => {
  process.env.IMAGE_PROVIDER = "midjourney";
  process.env.IMAGE_MODEL = "v7";
  process.env.IMAGE_API_KEY = "test-key";
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}");
  };
  await assert.rejects(
    generateMarketingImage({ prompt: "Solar campaign" }),
    error => {
      assert.equal(error.code, "IMAGE_PROVIDER_CAPABILITY_UNSUPPORTED");
      assert.equal(error.status, 503);
      return true;
    },
  );
  assert.equal(called, false);
});

test("gpt-image-1 receives a supported size and returns decoded base64", async () => {
  process.env.IMAGE_PROVIDER = "openai";
  process.env.IMAGE_MODEL = "gpt-image-1";
  process.env.IMAGE_API_KEY = "test-key";
  const payload = Buffer.from("fake-png-bytes");
  let received = null;
  globalThis.fetch = async (url, options) => {
    received = { url: String(url), body: JSON.parse(options.body), headers: options.headers };
    return new Response(JSON.stringify({ data: [{ b64_json: payload.toString("base64") }] }), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "req-openai-1" },
    });
  };
  const previousInfo = console.info;
  console.info = () => {};
  try {
    const image = await generateMarketingImage({ prompt: "Rooftop solar", aspectRatio: "4:5" });
    assert.match(received.url, /api\.openai\.com\/v1\/images\/generations/);
    assert.equal(received.body.model, "gpt-image-1");
    assert.equal(received.body.size, "1024x1536");
    assert.equal("response_format" in received.body, false);
    assert.equal(image.provider, "openai");
    assert.equal(image.mimeType, "image/png");
    assert.deepEqual(image.buffer, payload);
    assert.equal(image.providerRequestId, "req-openai-1");
  } finally {
    console.info = previousInfo;
  }
});

test("dall-e-3 requests base64 output with a portrait size", async () => {
  process.env.IMAGE_PROVIDER = "openai";
  process.env.IMAGE_MODEL = "dall-e-3";
  process.env.IMAGE_API_KEY = "test-key";
  let body = null;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("x").toString("base64") }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const previousInfo = console.info;
  console.info = () => {};
  try {
    await generateMarketingImage({ prompt: "Story creative", aspectRatio: "9:16" });
    assert.equal(body.response_format, "b64_json");
    assert.equal(body.size, "1024x1792");
  } finally {
    console.info = previousInfo;
  }
});

test("an OpenAI failure is classified without leaking the API key", async () => {
  process.env.IMAGE_PROVIDER = "openai";
  process.env.IMAGE_MODEL = "gpt-image-1";
  process.env.IMAGE_API_KEY = "sk-secret-value";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { code: "invalid_api_key", message: "Incorrect API key provided: sk-secret-value" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  const previousError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      generateMarketingImage({ prompt: "Solar awareness" }),
      error => {
        assert.equal(error.code, "PROVIDER_AUTHENTICATION_ERROR");
        assert.equal(error.retryable, false);
        assert.doesNotMatch(String(error.providerMessage), /sk-secret-value/);
        return true;
      },
    );
  } finally {
    console.error = previousError;
  }
});
