import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureCloudinary } from "./cloudinary.mjs";
import {
  deliverLocalResourceFile,
  inlinePreviewable,
  localFilePath,
  resolveResourceSource,
} from "./resource-delivery.mjs";

const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
);

test("inline and attachment decisions follow the document type", () => {
  assert.equal(inlinePreviewable("application/pdf", false), true);
  assert.equal(inlinePreviewable("application/pdf", true), false);
  assert.equal(inlinePreviewable("application/msword", false), false);
});

test("local upload paths stay inside the configured upload directory", () => {
  const root = "/tmp/solarious-uploads";
  assert.equal(
    localFilePath("/api/files/local-test.pdf?download=1", root),
    join(root, "local-test.pdf"),
  );
  assert.equal(localFilePath("https://example.com/file.pdf", root), null);
  assert.equal(
    localFilePath("/api/files/..%2F..%2Fetc%2Fpasswd", root),
    join(root, "passwd"),
  );
});

test("local documents download and preview with the correct bytes and headers", async (t) => {
  const uploadDir = await mkdtemp(join(tmpdir(), "solarious-document-"));
  await writeFile(join(uploadDir, "local-test.pdf"), pdf);

  const itemFor = (id) => ({
    _id: id,
    fileName: "local-test.pdf",
    fileType: "application/pdf",
    fileUrl: "/api/files/local-test.pdf",
    storageId: id === "missing" ? "local:missing.pdf" : "local:local-test.pdf",
  });

  const app = express();
  app.get("/api/resources/:id/file", async (req, res) => {
    const download = req.query.download === "1";
    const item = itemFor(req.params.id);
    const source = resolveResourceSource(item, {
      download,
      uploadDir,
      localUploadsEnabled: true,
      cloudinaryConfigured: false,
    });
    if (source.kind === "local") {
      await deliverLocalResourceFile({
        res,
        item,
        filePath: source.filePath,
        download,
      });
      return;
    }
    res.status(source.status || 500).json({ error: source.error || "Unexpected source" });
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(uploadDir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const downloadResponse = await fetch(
    `${origin}/api/resources/local/file?download=1`,
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get("content-type"), "application/pdf");
  assert.match(
    downloadResponse.headers.get("content-disposition") || "",
    /^attachment; filename="local-test\.pdf"$/,
  );
  assert.equal(downloadResponse.headers.get("content-length"), String(pdf.length));
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), pdf);

  const previewResponse = await fetch(`${origin}/api/resources/local/file`);
  assert.equal(previewResponse.status, 200);
  assert.match(
    previewResponse.headers.get("content-disposition") || "",
    /^inline; filename="local-test\.pdf"$/,
  );
  assert.deepEqual(Buffer.from(await previewResponse.arrayBuffer()), pdf);

  const missingResponse = await fetch(
    `${origin}/api/resources/missing/file?download=1`,
  );
  assert.equal(missingResponse.status, 404);
});

test("Cloudinary records still use a signed raw download URL", () => {
  configureCloudinary("cloudinary://12345:secret@demo");
  const source = resolveResourceSource(
    {
      storageId: "solarious/resources/bis-certificate.pdf",
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/bis.pdf",
    },
    { download: true, cloudinaryConfigured: true },
  );
  assert.equal(source.kind, "remote");
  assert.match(source.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/raw\/download/);
  assert.match(source.url, /attachment=true/);
});

test("local uploads are unavailable when local storage is disabled", () => {
  const source = resolveResourceSource(
    {
      storageId: "local:local-test.pdf",
      fileUrl: "/api/files/local-test.pdf",
    },
    { download: true, uploadDir: "/tmp/uploads", localUploadsEnabled: false },
  );
  assert.deepEqual(source, { kind: "unavailable", status: 404, error: "Not found" });
});
