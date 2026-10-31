/**
 * Business-location coordinate helpers.
 *
 * The admin panel is the single source of truth for latitude/longitude. These
 * helpers exist so every surface (admin form, API response mapping, public map)
 * validates and orders coordinates the same way:
 *
 *   Google Maps  -> { lat: latitude, lng: longitude }
 *   GeoJSON      -> [longitude, latitude]
 *
 * Nothing here geocodes a business name or falls back to an approximate city
 * point: an invalid coordinate returns `null` and the UI shows an explicit
 * "location not configured" state instead of a wrong pin.
 */

export const LOCATION_PLACE_ID = "ChIJr08tLgDX3jsRy_ufuwXzE78";
export const LOCATION_NAME = "Mayureshwar Solar Energy Pvt Ltd";

/** Initial zoom for the business marker (Task requirement: 17). */
export const DEFAULT_MAP_ZOOM = 17;
export const MIN_MAP_ZOOM = 5;
export const MAX_MAP_ZOOM = 21;

export type Coordinates = { latitude: number; longitude: number };

/**
 * Parse a coordinate value coming from an admin input, JSON body or database
 * document. Accepts numbers and numeric strings ("21.112841"), rejects
 * null/undefined/blank strings/NaN/Infinity and out-of-range values.
 */
export function parseCoordinate(
  value: unknown,
  kind: "latitude" | "longitude",
): number | null {
  if (value === null || value === undefined) return null;
  // Only genuine numbers or numeric strings are coordinates. Anything else
  // (arrays, objects, booleans) coerces to 0 or 1 in JavaScript and would
  // silently produce a bogus pin.
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) return null;
  const limit = kind === "latitude" ? 90 : 180;
  if (numeric < -limit || numeric > limit) return null;
  return numeric;
}

/**
 * Validate a coordinate pair. Returns the normalised numbers plus a per-field
 * error map — never a silently substituted location.
 */
export function validateCoordinates(
  latitude: unknown,
  longitude: unknown,
): { coordinates: Coordinates | null; errors: { latitude?: string; longitude?: string } } {
  const errors: { latitude?: string; longitude?: string } = {};
  const lat = parseCoordinate(latitude, "latitude");
  const lng = parseCoordinate(longitude, "longitude");
  if (lat === null) {
    errors.latitude = "Enter a latitude between -90 and 90 (for example 21.112841).";
  }
  if (lng === null) {
    errors.longitude = "Enter a longitude between -180 and 180 (for example 74.799438).";
  }
  if (lat !== null && lng !== null && lat === 0 && lng === 0) {
    errors.latitude = "0, 0 is not a business location — enter the coordinates from Google Maps.";
  }
  if (Object.keys(errors).length) return { coordinates: null, errors };
  return { coordinates: { latitude: lat as number, longitude: lng as number }, errors };
}

/** True only when both saved values are usable numbers inside valid ranges. */
export function hasValidCoordinates(value: {
  latitude?: unknown;
  longitude?: unknown;
}): boolean {
  return validateCoordinates(value.latitude, value.longitude).coordinates !== null;
}

/** Serialise coordinates for a query string: "lat,lng" (Google's order). */
export function coordinateQuery(latitude: number, longitude: number, precision = 6): string {
  return `${latitude.toFixed(precision)},${longitude.toFixed(precision)}`;
}

/**
 * Google Maps embed URL pinned to the exact admin coordinates, with an optional
 * marker label and zoom. The label is passed as a hint only — the pin position
 * always comes from the numbers, so no name geocoding can move it.
 */
export function mapEmbedUrl(
  { latitude, longitude }: Coordinates,
  options: { zoom?: number; label?: string } = {},
): string {
  const zoom = Math.min(
    MAX_MAP_ZOOM,
    Math.max(MIN_MAP_ZOOM, Math.round(options.zoom ?? DEFAULT_MAP_ZOOM)),
  );
  const coordinates = coordinateQuery(latitude, longitude);
  const label = (options.label ?? "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const query = label ? `${coordinates}(${encodeURIComponent(label)})` : coordinates;
  return `https://www.google.com/maps?q=${query}&z=${zoom}&hl=en&output=embed`;
}

/** "Open in Google Maps" link for the pinned coordinates. */
export function mapsCoordinateUrl({ latitude, longitude }: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    coordinateQuery(latitude, longitude),
  )}`;
}

/** Verified Place ID reference — used to verify the pin, never as the map source. */
export function mapsPlaceUrl(placeId: string = LOCATION_PLACE_ID): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    LOCATION_NAME,
  )}&query_place_id=${encodeURIComponent(placeId)}`;
}

/** Turn-by-turn directions to the exact coordinates. */
export function mapsDirectionsUrl({ latitude, longitude }: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    coordinateQuery(latitude, longitude),
  )}&travelmode=driving`;
}

/** Clamp a zoom step so the +/- controls stay inside Google's range. */
export function stepZoom(current: number, delta: number): number {
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(current) + delta));
}
