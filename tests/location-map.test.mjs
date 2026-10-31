import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_MAP_ZOOM,
  LOCATION_PLACE_ID,
  coordinateQuery,
  mapEmbedUrl,
  mapsCoordinateUrl,
  mapsDirectionsUrl,
  mapsPlaceUrl,
  parseCoordinate,
  stepZoom,
  validateCoordinates,
} from "../lib/location.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const PIN = { latitude: 21.112841, longitude: 74.799437 };

test("latitude and longitude are validated inside their own ranges", () => {
  assert.equal(parseCoordinate(21.112841, "latitude"), 21.112841);
  assert.equal(parseCoordinate("74.799437", "longitude"), 74.799437);
  for (const invalid of [null, undefined, "", "  ", "abc", Number.NaN, Infinity, {}, []]) {
    assert.equal(parseCoordinate(invalid, "latitude"), null, `${String(invalid)} must be rejected`);
  }
  // Ranges differ per axis: 100 is a valid longitude but an invalid latitude.
  assert.equal(parseCoordinate(100, "latitude"), null);
  assert.equal(parseCoordinate(100, "longitude"), 100);
  assert.equal(parseCoordinate(-91, "latitude"), null);
  assert.equal(parseCoordinate(-181, "longitude"), null);
  assert.equal(parseCoordinate(90, "latitude"), 90);
  assert.equal(parseCoordinate(180, "longitude"), 180);
});

test("an empty or invalid coordinate never becomes a saved 0 value", () => {
  const blank = validateCoordinates("", "");
  assert.equal(blank.coordinates, null);
  assert.match(blank.errors.latitude, /between -90 and 90/);
  assert.match(blank.errors.longitude, /between -180 and 180/);

  // Number("") === 0 in JavaScript: this is the bug that silently moved the pin.
  assert.equal(Number(""), 0);
  assert.equal(validateCoordinates("", "").coordinates, null);

  const zeroPair = validateCoordinates(0, 0);
  assert.equal(zeroPair.coordinates, null);
  assert.match(zeroPair.errors.latitude, /not a business location/);
});

test("a valid pair is returned unswopped", () => {
  const { coordinates, errors } = validateCoordinates("21.112841", "74.799437");
  assert.deepEqual(errors, {});
  assert.deepEqual(coordinates, PIN);
  assert.ok(coordinates.latitude < coordinates.longitude, "latitude stays the first value");
});

test("the embed URL pins Google Maps to the coordinates at zoom 17", () => {
  const url = new URL(mapEmbedUrl(PIN, { label: "Mayureshwar Solar Energy Pvt Ltd" }));
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.searchParams.get("output"), "embed");
  assert.equal(url.searchParams.get("z"), String(DEFAULT_MAP_ZOOM));
  assert.equal(DEFAULT_MAP_ZOOM, 17);
  // Google's order is lat,lng — a swapped pair would point at the Indian Ocean.
  const query = url.searchParams.get("q");
  assert.ok(query.startsWith("21.112841,74.799437"), `unexpected q: ${query}`);
  assert.match(query, /\(Mayureshwar Solar Energy Pvt Ltd\)$/);
});

test("embed zoom is clamped to Google's supported range", () => {
  assert.equal(new URL(mapEmbedUrl(PIN, { zoom: 99 })).searchParams.get("z"), "21");
  assert.equal(new URL(mapEmbedUrl(PIN, { zoom: 1 })).searchParams.get("z"), "5");
  assert.equal(stepZoom(17, 1), 18);
  assert.equal(stepZoom(17, -1), 16);
  assert.equal(stepZoom(21, 1), 21);
  assert.equal(stepZoom(5, -1), 5);
});

test("directions and place links use the coordinates, Place ID only for verification", () => {
  const directions = new URL(mapsDirectionsUrl(PIN));
  assert.equal(directions.hostname, "www.google.com");
  assert.equal(directions.searchParams.get("api"), "1");
  assert.equal(directions.searchParams.get("destination"), "21.112841,74.799437");

  const coordinateLink = new URL(mapsCoordinateUrl(PIN));
  assert.equal(coordinateLink.searchParams.get("query"), "21.112841,74.799437");

  const place = new URL(mapsPlaceUrl());
  assert.equal(place.searchParams.get("query_place_id"), LOCATION_PLACE_ID);
  assert.equal(LOCATION_PLACE_ID, "ChIJr08tLgDX3jsRy_ufuwXzE78");
});

test("coordinateQuery always serialises latitude first", () => {
  assert.equal(coordinateQuery(21.112841, 74.799437), "21.112841,74.799437");
  assert.equal(coordinateQuery(-33.8688, 151.2093), "-33.868800,151.209300");
});

test("the public map renders from saved coordinates and reports missing ones", async () => {
  const [map, contact, cms] = await Promise.all([
    read("components/location-map.tsx"),
    read("app/contact/page.tsx"),
    read("lib/site-cms.ts"),
  ]);
  assert.match(map, /mapEmbedUrl\(coordinates/);
  assert.match(map, /validateCoordinates\(location\.latitude, location\.longitude\)/);
  assert.match(map, /DEFAULT_MAP_ZOOM/);
  assert.match(map, /mapsDirectionsUrl/);
  assert.match(map, /requestFullscreen/);
  assert.match(map, /location-map-toolbar/);
  assert.match(map, /location-map-popup/);
  // No hardcoded fallback pin: unusable coordinates must not render a map.
  assert.match(map, /location-map-unavailable/);
  assert.doesNotMatch(map, /21\.112/, "the component must not hardcode coordinates");
  // The contact page must never be baked with build-time coordinates.
  assert.match(contact, /export const dynamic = "force-dynamic"/);
  // The API payload is mapped to numbers before it reaches the map.
  assert.match(cms, /latitude: Number\(item\.latitude\)/);
});

test("admin panel keeps raw coordinate strings and blocks invalid saves", async () => {
  const admin = await read("components/admin-site-cms.tsx");
  assert.match(admin, /type LocationDraft = Omit<Location, "latitude" \| "longitude">/);
  assert.match(admin, /validateCoordinates\(/);
  assert.match(admin, /setLocationErrors/);
  // Number("") must never be assigned straight from the input.
  assert.doesNotMatch(admin, /latitude: Number\(e\.target\.value\)/);
  assert.doesNotMatch(admin, /longitude: Number\(e\.target\.value\)/);
});

test("backend validates coordinates and exposes GET/POST/PUT/PATCH/DELETE", async () => {
  const server = await read("backend/server.mjs");
  for (const route of [
    'app.get("/api/locations"',
    'app.get("/api/admin/locations"',
    'app.post("/api/admin/locations"',
    'app.put("/api/admin/locations/:id"',
    'app.patch("/api/admin/locations/:id"',
    'app.delete("/api/admin/locations/:id"',
  ]) {
    assert.ok(server.includes(route), `missing ${route}`);
  }
  // Range checks live on the server, not only in the form.
  assert.match(server, /locationCoordinate\(body\?\.latitude,-90,90\)/);
  assert.match(server, /locationCoordinate\(body\?\.longitude,-180,180\)/);
  assert.match(server, /if\(latitude===0&&longitude===0\)/);
  // Blank strings are rejected instead of being coerced to zero.
  assert.match(server, /typeof raw==="string"&&raw\.trim\(\)===""\)return null/);
  // Reads are normalised so the API always returns numbers in lat,lng order.
  assert.match(server, /const locationView=row=>/);
  assert.match(server, /\.map\(locationView\)/);
  // PATCH must be a partial update: a coordinate-only save cannot blank fields.
  assert.match(server, /app\.patch\("\/api\/admin\/locations\/:id",admin/);
  assert.match(server, /locationValues\(req\.body,\{partial:true\}\)/);
});
