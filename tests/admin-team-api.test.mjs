import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The admin dashboard loads six endpoints in a single `Promise.all`, so one
 * unregistered route takes the whole overview down with a
 * `Cannot GET /api/admin/team` banner. This suite walks every admin endpoint
 * the dashboard depends on and asserts the Express app actually registers it —
 * the guard that would have caught the missing team CRUD routes.
 */
const DASHBOARD_ENDPOINTS = [
  "/api/admin/inquiries",
  "/api/admin/products",
  "/api/admin/gallery",
  "/api/admin/events",
  "/api/admin/team",
  "/api/admin/resources",
];

const registeredRoutes = (source) => {
  const routes = new Set();
  const pattern = /app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) routes.add(match[2]);
  return routes;
};

test("every endpoint the admin dashboard loads in parallel is registered", async () => {
  const server = await read("backend/server.mjs");
  const routes = registeredRoutes(server);
  for (const endpoint of DASHBOARD_ENDPOINTS) {
    assert.ok(
      routes.has(endpoint),
      `backend/server.mjs registers no route for ${endpoint}, so the dashboard Promise.all fails`,
    );
  }
});

test("team CRUD covers the list, create, update, toggle and delete verbs the panel calls", async () => {
  const server = await read("backend/server.mjs");
  const routes = registeredRoutes(server);
  assert.ok(routes.has("/api/admin/team"), "GET /api/admin/team is missing");
  assert.ok(routes.has("/api/admin/team/:id"), "PUT/PATCH/DELETE /api/admin/team/:id is missing");

  const verbsFor = (path) =>
    new Set(
      [...server.matchAll(new RegExp(`app\\.(get|post|put|patch|delete)\\(\\s*"${path.replace(/[/:]/g, "\\$&")}"`, "g"))].map(
        (match) => match[1],
      ),
    );

  assert.deepEqual(
    [...verbsFor("/api/admin/team")].sort(),
    ["get", "post"],
    "the team collection needs a list and a create route",
  );
  assert.deepEqual(
    [...verbsFor("/api/admin/team/:id")].sort(),
    ["delete", "patch", "put"],
    "the team panel edits with PUT, toggles with PATCH and removes with DELETE",
  );
});

test("team routes reuse the existing admin auth, upload and serialiser helpers", async () => {
  const server = await read("backend/server.mjs");
  const teamLines = server
    .split("\n")
    .filter((line) => line.includes('/api/admin/team"') || line.includes('/api/admin/team/:id"'));
  assert.ok(teamLines.length >= 5, "expected the five team routes to be registered");
  for (const line of teamLines) {
    assert.match(line, /admin,/, "every team route must sit behind the admin session middleware");
  }
  assert.match(server, /app\.post\("\/api\/admin\/team",admin,teamPhoto,/);
  assert.match(server, /app\.put\("\/api\/admin\/team\/:id",admin,teamPhoto,/);
  assert.match(server, /teamRoute\("create"/);
  assert.match(server, /teamMember\(item\.toObject\(\)\)/);
  assert.match(server, /destroyUpload\(item\.photoPublicId\)/);
});

test("team writes validate the fields the admin form submits", async () => {
  const server = await read("backend/server.mjs");
  assert.match(server, /const teamValues=\(body\)=>/);
  assert.match(server, /Enter the team member's full name\./);
  assert.match(server, /Enter a designation for the team member\./);
  assert.match(server, /Enter short information about the team member\./);
  assert.match(server, /Enter a valid email address\./);
  /* The file input only accepts JPG/PNG/WebP at 5 MB, and the multer filter
     mirrors that so an oversized photograph is rejected before upload. */
  assert.match(server, /teamPhotoUpload=multer\(\{storage:multer\.memoryStorage\(\),limits:\{fileSize:5\*1024\*1024\}/);
});

test("the public About Us feed and the admin list share one serialiser", async () => {
  const [server, teamSection] = await Promise.all([
    read("backend/server.mjs"),
    read("components/team-section.tsx"),
  ]);
  const routes = registeredRoutes(server);
  assert.ok(routes.has("/api/team"), "the About Us page reads /api/team");
  assert.match(server, /app\.get\("\/api\/team",asyncRoute\(async\(_req,res\)=>\{[^}]*isActive:true/);
  assert.match(teamSection, /fetch\("\/api\/team"/);
  assert.match(server, /const teamMember=row=>/);
});

test("one unreachable dashboard feed cannot blank the whole overview", async () => {
  const dashboard = await read("components/admin-dashboard.tsx");
  assert.match(dashboard, /Promise\.allSettled\(/, "feeds must settle independently");
  assert.doesNotMatch(
    dashboard,
    /Promise\.all\(\[adminFetch/,
    "a single Promise.all rejects the whole dashboard when one feed 404s",
  );
  assert.match(dashboard, /const DASHBOARD_FEEDS/);
  for (const path of DASHBOARD_ENDPOINTS) {
    assert.ok(dashboard.includes(path), `dashboard no longer requests ${path}`);
  }
  assert.match(dashboard, /failures\.push\(/);
  assert.match(dashboard, /Some dashboard data could not be loaded\./);
});

test("an HTML error page is never rendered verbatim in the admin banner", async () => {
  const apiErrorSource = await read("lib/api-error.ts");
  assert.match(apiErrorSource, /looksLikeMarkup/);
  assert.match(apiErrorSource, /<!doctype|<html/i);
  /* Falls back to a readable status-aware message instead. */
  assert.match(apiErrorSource, /`\$\{fallback\} \(HTTP \$\{response\.status\}\)`/);
});
