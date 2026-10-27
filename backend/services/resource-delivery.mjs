import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { createSignedRawDownload } from "./cloudinary.mjs";

export const safeFileName = (value) =>
  basename(String(value || "file")).replace(/[^a-zA-Z0-9._-]/g, "_");

export const inlinePreviewable = (fileType, download) =>
  ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
    String(fileType || ""),
  ) && download !== true;

/**
 * Resolve an `/api/files/...` upload to a path inside the local upload folder.
 * Returns null for anything that is not a same-origin local upload.
 */
export function localFilePath(fileUrl, uploadDir) {
  try {
    const raw = String(fileUrl || "");
    if (!raw.startsWith("/api/files/")) return null;
    const encodedName = raw.slice("/api/files/".length).split(/[?#]/)[0];
    if (!encodedName) return null;
    const name = safeFileName(decodeURIComponent(encodedName));
    const root = resolve(uploadDir);
    const target = resolve(root, name);
    if (target !== root && !target.startsWith(root + sep)) return null;
    return target;
  } catch {
    return null;
  }
}

/**
 * Choose the document source without assuming every stored file is Cloudinary.
 * Legacy records and local development uploads use `/api/files/...` URLs with
 * `local:` storage IDs; these must be streamed directly instead of being passed
 * to the Cloudinary signed-download helper.
 */
export function resolveResourceSource(
  item,
  {
    download = false,
    uploadDir,
    localUploadsEnabled = false,
    cloudinaryConfigured = false,
  } = {},
) {
  const storageId = String(item?.storageId || "");
  const fileUrl = String(item?.fileUrl || "");
  const localUrl = storageId.startsWith("local:")
    ? `/api/files/${storageId.slice(6)}`
    : fileUrl.startsWith("/api/files/")
      ? fileUrl
      : "";

  if (localUrl) {
    if (!localUploadsEnabled || !uploadDir) {
      return { kind: "unavailable", status: 404, error: "Not found" };
    }
    const filePath = localFilePath(localUrl, uploadDir);
    return filePath
      ? { kind: "local", filePath }
      : { kind: "unavailable", status: 404, error: "Not found" };
  }

  if (storageId) {
    if (!cloudinaryConfigured) {
      return {
        kind: "unavailable",
        status: 503,
        error: "Document storage is not configured.",
      };
    }
    try {
      return {
        kind: "remote",
        url: createSignedRawDownload({
          publicId: storageId,
          attachment: download,
        }),
      };
    } catch (error) {
      return {
        kind: "unavailable",
        status: Number(error?.status) || 503,
        error: error?.message || "Document storage is not configured.",
      };
    }
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return { kind: "remote", url: fileUrl };
  }
  return { kind: "unavailable", status: 404, error: "Not found" };
}

/** Stream a local document with explicit, download-safe response headers. */
export async function deliverLocalResourceFile({ res, item, filePath, download }) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    return res.status(404).json({ error: "Not found" });
  }
  if (!info.isFile()) return res.status(404).json({ error: "Not found" });

  const fileName = safeFileName(item.fileName);
  const fileType = item.fileType || "application/octet-stream";
  const inline = inlinePreviewable(fileType, download);
  res.status(200);
  res.setHeader("Content-Type", fileType);
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
  );
  res.setHeader("Content-Length", String(info.size));
  res.setHeader("Cache-Control", "private, max-age=300, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (typeof res.removeHeader === "function") res.removeHeader("Content-Encoding");

  try {
    await pipeline(createReadStream(filePath), res);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: "File could not be read." });
    }
    res.destroy(error);
  }
}
