import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

const credentialError = (message, code = "CLOUDINARY_CONFIGURATION_INVALID") =>
  Object.assign(new Error(message), { status: 503, stage: "storage_configuration", code });

export function parseCloudinaryUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return { configured: false, error: "CLOUDINARY_URL is missing." };

  try {
    const url = new URL(raw);
    const cloudName = decodeURIComponent(url.hostname).trim();
    const apiKey = decodeURIComponent(url.username).trim();
    const apiSecret = decodeURIComponent(url.password).trim();
    if (url.protocol !== "cloudinary:" || !cloudName || !apiKey || !apiSecret) {
      return { configured: false, error: "CLOUDINARY_URL must use cloudinary://API_KEY:API_SECRET@CLOUD_NAME." };
    }
    return { configured: true, cloudName, apiKey, apiSecret };
  } catch {
    return { configured: false, error: "CLOUDINARY_URL is malformed." };
  }
}

export function configureCloudinary(value = process.env.CLOUDINARY_URL, client = cloudinary) {
  const parsed = parseCloudinaryUrl(value);
  if (!parsed.configured) return parsed;
  // The SDK reads CLOUDINARY_URL on its first config() call. Normalize the same
  // single source before that happens, then explicitly apply the decoded values.
  if (client === cloudinary) process.env.CLOUDINARY_URL = String(value).trim();
  client.config({ cloud_name: parsed.cloudName, api_key: parsed.apiKey, api_secret: parsed.apiSecret, secure: true });
  return { configured: true, cloudName: parsed.cloudName, apiKey: parsed.apiKey };
}

export function createSignedImageUpload({ folder, prefix, now = Date.now(), client = cloudinary }) {
  const config = client.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) throw credentialError("Cloud storage is not configured.");

  const timestamp = Math.floor(now / 1000);
  const publicId = `${prefix}-${randomUUID()}`;
  const params = { folder, overwrite: false, public_id: publicId, timestamp };
  const signature = client.utils.api_sign_request(params, config.api_secret);

  return {
    timestamp,
    folder,
    publicId,
    overwrite: false,
    signature,
    apiKey: config.api_key,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`,
  };
}

export function createSignedRawUpload({ folder, prefix, now = Date.now(), client = cloudinary }) {
  const config = client.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) throw credentialError("Cloud storage is not configured.");
  const timestamp = Math.floor(now / 1000);
  const publicId = `${prefix}-${randomUUID()}`;
  const params = { folder, overwrite: false, public_id: publicId, timestamp };
  return {
    timestamp,
    folder,
    publicId,
    overwrite: false,
    signature: client.utils.api_sign_request(params, config.api_secret),
    apiKey: config.api_key,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloud_name}/raw/upload`,
  };
}

export function createSignedRawDownload({ publicId, attachment = false, expiresAt = Math.floor(Date.now() / 1000) + 300, client = cloudinary }) {
  const config = client.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) throw credentialError("Cloud storage is not configured.");
  if (!String(publicId || "").startsWith("solarious/")) throw credentialError("The stored document identifier is invalid.", "CLOUDINARY_RESOURCE_INVALID");

  const extension = String(publicId).split("/").at(-1)?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (!extension) throw credentialError("The stored document format is invalid.", "CLOUDINARY_RESOURCE_INVALID");

  // Cloudinary requires a format when signing the download API request, even
  // though raw public IDs already contain their file extension.
  return client.utils.private_download_url(String(publicId), extension, {
    resource_type: "raw",
    type: "upload",
    attachment,
    expires_at: expiresAt,
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: true,
  });
}

let verifiedUntil = 0;
let verification;

export async function verifyCloudinaryCredentials({ client = cloudinary, now = Date.now(), cacheMs = 5 * 60 * 1000 } = {}) {
  if (verifiedUntil > now) return;
  if (!verification) {
    verification = Promise.resolve(client.api.ping())
      .then(result => {
        if (result?.status !== "ok") throw new Error("Cloudinary ping did not return ok.");
        verifiedUntil = Date.now() + cacheMs;
      })
      .catch(() => {
        throw credentialError("Cloud storage credentials could not be verified.", "CLOUDINARY_CREDENTIALS_INVALID");
      })
      .finally(() => { verification = undefined; });
  }
  await verification;
}

export function resetCloudinaryVerificationCache() {
  verifiedUntil = 0;
  verification = undefined;
}

export { cloudinary };
