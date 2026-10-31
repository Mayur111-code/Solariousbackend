/**
 * Constant-time comparison for cron credentials.
 *
 * Deliberately avoids `===` on secrets: a byte-wise comparison that exits early
 * leaks the length of the matching prefix. Both sides are hashed to a fixed
 * length first, so the comparison always touches the same number of bytes.
 */
export async function cronAuthorised(request: Request): Promise<boolean> {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(header)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let diff = header.length === expected.length ? 0 : 1;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}
