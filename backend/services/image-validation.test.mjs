import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { validateImageBuffer } from "./image-validation.mjs";

for (const [format, type] of [["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]) {
  test(`accepts a valid ${format.toUpperCase()} image`, async () => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#f5a623" } }).toFormat(format).toBuffer();
    const result = await validateImageBuffer(buffer);
    assert.equal(result.type, type);
  });
}

test("rejects content that only claims to be an image", async () => {
  await assert.rejects(validateImageBuffer(Buffer.from("not an image")), /not a valid image/i);
});

test("rejects an unsupported image format", async () => {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).gif().toBuffer();
  await assert.rejects(validateImageBuffer(buffer), /format is not supported/i);
});

test("rejects an image over the configured byte limit", async () => {
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).png().toBuffer();
  await assert.rejects(validateImageBuffer(buffer, { maxBytes: buffer.length - 1 }), /MB or smaller/i);
});
