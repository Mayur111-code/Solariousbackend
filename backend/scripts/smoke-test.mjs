const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
const adminUsername = process.env.ADMIN_USERNAME?.trim();
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
const frontendOrigin = process.env.SMOKE_TEST_ORIGIN || "http://localhost:3000";

if (!adminUsername || !adminPassword) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required for the smoke test");
}

async function check(name, path, options, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(`${name}: expected ${expectedStatus}, received ${response.status}: ${body.slice(0, 200)}`);
  }
  console.log(`${name}: ${response.status}`);
  return response;
}

const health = await check("health", "/api/health", {}, 200);
const healthBody = await health.json();
if (healthBody.ok !== true || healthBody.database !== "connected") {
  throw new Error("health: application or database is not healthy");
}

await check("admin without session", "/api/admin/inquiries", {}, 401);
await check("invalid login", "/api/admin/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: adminUsername, password: `${adminPassword}-invalid` }),
}, 401);

const login = await check("admin login", "/api/admin/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username: adminUsername, password: adminPassword }),
}, 200);
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("admin login did not return a session cookie");

const authenticated = { headers: { cookie } };
for (const [name, path] of [
  ["admin session", "/api/admin/session"],
  ["admin inquiries", "/api/admin/inquiries"],
  ["admin products", "/api/admin/products"],
  ["admin resources", "/api/admin/resources"],
  ["admin homepage", "/api/admin/hero-banners"],
  ["admin marketing settings", "/api/admin/creative-settings"],
  ["admin marketing history", "/api/admin/creatives"],
  ["admin logs", "/api/admin/logs"],
]) await check(name, path, authenticated, 200);

const preflight = await check("CORS preflight", "/api/admin/inquiries", {
  method: "OPTIONS",
  headers: {
    Origin: frontendOrigin,
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "content-type",
  },
}, 204);
if (preflight.headers.get("access-control-allow-origin") !== frontendOrigin) {
  throw new Error("CORS preflight did not return the expected allowed origin");
}
if (preflight.headers.get("access-control-allow-credentials") !== "true") {
  throw new Error("CORS preflight did not allow credentials");
}

const logout = await check("admin logout", "/api/admin/logout", {
  method: "POST",
  headers: { cookie },
}, 200);
const cleared = logout.headers.get("set-cookie");
if (!cleared?.includes("Max-Age=0")) throw new Error("logout did not clear the session cookie");
await check("session rejected after logout", "/api/admin/session", {}, 401);

console.log("Solarious backend session-auth smoke test passed.");
