import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * The location validator lives inside backend/server.mjs, which cannot be
 * imported without a MongoDB connection. These tests extract the two pure
 * helper functions from the source and exercise their real behaviour, so the
 * server-side rules are covered without a database.
 */
async function loadValidators() {
  const source = await readFile(new URL("../backend/server.mjs", import.meta.url), "utf8");
  const start = source.indexOf("const locationCoordinate=");
  assert.ok(start > -1, "locationCoordinate not found in backend/server.mjs");
  const endMarker = "return {values,errors,ok:Object.keys(errors).length===0};";
  const end = source.indexOf(endMarker, start);
  assert.ok(end > -1, "locationValues not found in backend/server.mjs");
  const snippet = source.slice(start, end + endMarker.length) + "\n};";
  const factory = new Function(`${snippet}; return { locationCoordinate, locationValues };`);
  return factory();
}

const valid = {
  name: "Mayureshwar Solar Energy Pvt Ltd",
  address: "4Q7X+4QP, Babhalde, Dhule, Maharashtra, India",
  latitude: 21.112841,
  longitude: 74.799437,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=21.112841%2C74.799437",
};

test("the server accepts the client's exact pin and keeps lat/lng order", async () => {
  const { locationValues } = await loadValidators();
  const { values, errors, ok } = locationValues(valid);
  assert.deepEqual(errors, {});
  assert.equal(ok, true);
  assert.equal(values.latitude, 21.112841);
  assert.equal(values.longitude, 74.799437);
  assert.ok(values.latitude < values.longitude);
});

test("blank coordinate strings are rejected instead of being saved as 0", async () => {
  const { locationValues } = await loadValidators();
  const { errors, ok } = locationValues({ ...valid, latitude: "", longitude: "" });
  assert.equal(ok, false);
  assert.match(errors.latitude, /between -90 and 90/);
  assert.match(errors.longitude, /between -180 and 180/);
});

test("out-of-range and non-numeric coordinates are rejected", async () => {
  const { locationValues } = await loadValidators();
  for (const body of [
    { latitude: 91, longitude: 74.799437 },
    { latitude: -91, longitude: 74.799437 },
    { latitude: 21.112841, longitude: 181 },
    { latitude: 21.112841, longitude: -181 },
    { latitude: "abc", longitude: 74.799437 },
    { latitude: null, longitude: 74.799437 },
    { latitude: 21.112841, longitude: undefined },
  ]) {
    const { ok, errors } = locationValues({ ...valid, ...body });
    assert.equal(ok, false, `expected rejection for ${JSON.stringify(body)}`);
    assert.ok(errors.latitude || errors.longitude);
  }
});

test("0,0 and an invalid map URL are rejected", async () => {
  const { locationValues } = await loadValidators();
  assert.match(locationValues({ ...valid, latitude: 0, longitude: 0 }).errors.latitude, /not a business location/);
  assert.ok(locationValues({ ...valid, mapsUrl: "javascript:alert(1)" }).errors.mapsUrl);
  assert.ok(locationValues({ ...valid, mapsUrl: "" }).errors.mapsUrl);
  assert.ok(locationValues({ ...valid, name: "  " }).errors.name);
  assert.ok(locationValues({ ...valid, address: "" }).errors.address);
});

test("PATCH mode only touches the supplied fields", async () => {
  const { locationValues } = await loadValidators();
  const coordinateOnly = locationValues({ latitude: 21.1129, longitude: 74.7995 }, { partial: true });
  assert.deepEqual(Object.keys(coordinateOnly.values).sort(), ["latitude", "longitude"]);
  assert.equal(coordinateOnly.ok, true);

  const badPartial = locationValues({ latitude: "  " }, { partial: true });
  assert.equal(badPartial.ok, false);
  assert.match(badPartial.errors.latitude, /between -90 and 90/);

  // An empty PATCH body is not a valid update (the route rejects it too).
  assert.deepEqual(locationValues({}, { partial: true }).values, {});
});
