import sharp from "sharp";

const formatToMime = new Map([
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["avif", "image/avif"],
]);

export async function validateImageBuffer(buffer, {
  allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  maxBytes = 5 * 1024 * 1024,
  label = "Image",
} = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error(`${label} is empty.`), { status: 400, stage: "validation" });
  }
  if (buffer.length > maxBytes) {
    throw Object.assign(new Error(`${label} must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`), { status: 413, stage: "validation" });
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    throw Object.assign(new Error(`${label} is not a valid image file.`), { status: 415, stage: "validation" });
  }

  const detectedType = formatToMime.get(metadata.format);
  if (!detectedType || !allowedTypes.includes(detectedType)) {
    throw Object.assign(new Error(`${label} format is not supported.`), { status: 415, stage: "validation" });
  }
  if (!metadata.width || !metadata.height) {
    throw Object.assign(new Error(`${label} has invalid dimensions.`), { status: 415, stage: "validation" });
  }

  return { type: detectedType, format: metadata.format, width: metadata.width, height: metadata.height };
}
