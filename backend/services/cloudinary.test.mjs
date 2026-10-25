import assert from "node:assert/strict";
import test from "node:test";
import { v2 as sdk } from "cloudinary";
import {
  configureCloudinary,
  createSignedImageUpload,
  createSignedRawDownload,
  createSignedRawUpload,
  parseCloudinaryUrl,
  resetCloudinaryVerificationCache,
  verifyCloudinaryCredentials,
} from "./cloudinary.mjs";

test("reports missing Cloudinary credentials without exposing values", () => {
  assert.deepEqual(parseCloudinaryUrl(""), { configured: false, error: "CLOUDINARY_URL is missing." });
});

test("creates a signed raw upload without exposing the API secret", () => {
  const config = { cloud_name: "demo", api_key: "12345", api_secret: "secret" };
  const client = { config: () => config, utils: sdk.utils };
  const signed = createSignedRawUpload({ folder: "solarious/product-datasheets", prefix: "datasheet", now: 1_791_890_128_999, client });
  assert.equal(signed.uploadUrl, "https://api.cloudinary.com/v1_1/demo/raw/upload");
  assert.match(signed.publicId, /^datasheet-/);
  assert.equal("apiSecret" in signed, false);
  assert.equal(signed.signature, sdk.utils.api_sign_request({folder:signed.folder,overwrite:false,public_id:signed.publicId,timestamp:signed.timestamp}, config.api_secret));
});

test("creates a short-lived signed raw download for protected documents", () => {
  const config = { cloud_name: "demo", api_key: "12345", api_secret: "secret" };
  const client = { config: () => config, utils: sdk.utils };
  const url = createSignedRawDownload({
    publicId: "solarious/resources/bis-certificate.pdf",
    expiresAt: 1_791_890_428,
    client,
  });
  assert.match(url, /^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/raw\/download/);
  assert.match(url, /public_id=solarious%2Fresources%2Fbis-certificate\.pdf/);
  assert.match(url, /format=pdf/);
  assert.match(url, /expires_at=1791890428/);
  assert.doesNotMatch(url, /secret/);
});

test("rejects a raw download without a file format", () => {
  const config = { cloud_name: "demo", api_key: "12345", api_secret: "secret" };
  const client = { config: () => config, utils: sdk.utils };
  assert.throws(
    () => createSignedRawDownload({ publicId: "solarious/resources/document", client }),
    error => error.code === "CLOUDINARY_RESOURCE_INVALID",
  );
});

test("rejects a raw download outside the managed Solarious folder", () => {
  const config = { cloud_name: "demo", api_key: "12345", api_secret: "secret" };
  const client = { config: () => config, utils: sdk.utils };
  assert.throws(
    () => createSignedRawDownload({ publicId: "untrusted/document.pdf", client }),
    error => error.code === "CLOUDINARY_RESOURCE_INVALID",
  );
});

test("explicitly configures one decoded CLOUDINARY_URL credential source", () => {
  const values = {};
  const client = { config(next) { if (next) Object.assign(values, next); return values; } };
  const result = configureCloudinary("  cloudinary://12345:secret%2Dvalue@solarious-test  ", client);
  assert.deepEqual(result, { configured: true, cloudName: "solarious-test", apiKey: "12345" });
  assert.deepEqual(values, { cloud_name: "solarious-test", api_key: "12345", api_secret: "secret-value", secure: true });
});

test("creates an SDK signature from the exact uploaded parameters and Unix seconds", () => {
  const config = { cloud_name: "demo", api_key: "12345", api_secret: "secret" };
  const client = { config: () => config, utils: sdk.utils };
  const signed = createSignedImageUpload({ folder: "solarious/gallery", prefix: "gallery", now: 1_791_890_128_999, client });
  const params = { folder: signed.folder, overwrite: signed.overwrite, public_id: signed.publicId, timestamp: signed.timestamp };
  assert.equal(signed.timestamp, 1_791_890_128);
  assert.equal(signed.signature, sdk.utils.api_sign_request(params, config.api_secret));
  assert.deepEqual(Object.keys(params).sort(), ["folder", "overwrite", "public_id", "timestamp"]);
});

test("accepts verified credentials and rejects a wrong secret safely", async () => {
  resetCloudinaryVerificationCache();
  await verifyCloudinaryCredentials({ client: { api: { ping: async () => ({ status: "ok" }) } }, cacheMs: 0 });
  resetCloudinaryVerificationCache();
  await assert.rejects(
    verifyCloudinaryCredentials({ client: { api: { ping: async () => { throw new Error("401 including sensitive provider details"); } } } }),
    error => error.code === "CLOUDINARY_CREDENTIALS_INVALID" && !error.message.includes("sensitive"),
  );
});
