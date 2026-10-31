"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Maximize2,
  MapPin,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MAP_ZOOM,
  coordinateQuery,
  mapEmbedUrl,
  mapsCoordinateUrl,
  mapsDirectionsUrl,
  mapsPlaceUrl,
  stepZoom,
  validateCoordinates,
} from "@/lib/location";

export type BusinessLocation = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
  verificationStatus?: "verified" | "pending";
};

/**
 * Public business-location map.
 *
 * The pin is placed from the latitude/longitude saved in the admin panel — the
 * Google Maps embed is built purely from those numbers (`q=lat,lng`), so no
 * place-name lookup can move the marker. If the saved coordinates are missing or
 * invalid the component reports it instead of rendering an unrelated location.
 */
export default function LocationMap({ location }: { location: BusinessLocation }) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
  const [fullscreen, setFullscreen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const { coordinates } = useMemo(
    () => validateCoordinates(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  );

  const embed = useMemo(
    () => (coordinates ? mapEmbedUrl(coordinates, { zoom, label: location.name }) : ""),
    [coordinates, zoom, location.name],
  );

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = frameRef.current;
    if (!node) return;
    if (fullscreen) {
      closeFullscreen();
      return;
    }
    setFullscreen(true);
    void node.requestFullscreen?.().catch(() => undefined);
  }, [closeFullscreen, fullscreen]);

  // Keep React state in sync when the user leaves fullscreen with Escape.
  useEffect(() => {
    const onChange = () => {
      const node = frameRef.current;
      setFullscreen(Boolean(node && document.fullscreenElement === node));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeFullscreen, fullscreen]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(location.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const directionsUrl = coordinates
    ? mapsDirectionsUrl(coordinates)
    : location.mapsUrl || mapsPlaceUrl();

  return (
    <section className="location-panel" id="business-location" aria-labelledby="location-heading">
      <div className="location-map-frame" ref={frameRef} data-fullscreen={fullscreen}>
        {coordinates ? (
          <>
            <iframe
              key={embed}
              title={`Map showing ${location.name} at ${coordinateQuery(coordinates.latitude, coordinates.longitude)}`}
              src={embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            <div className="location-map-toolbar" role="group" aria-label="Map controls">
              <button
                type="button"
                onClick={() => setZoom((current) => stepZoom(current, 1))}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((current) => stepZoom(current, -1))}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(DEFAULT_MAP_ZOOM)}
                aria-label="Reset zoom to 17"
                title="Reset zoom"
              >
                <MapPin size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit fullscreen map" : "View map fullscreen"}
                aria-pressed={fullscreen}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? (
                  <Minimize2 size={16} aria-hidden="true" />
                ) : (
                  <Maximize2 size={16} aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="location-map-popup" data-open={infoOpen}>
              {infoOpen ? (
                <>
                  <button
                    type="button"
                    className="location-popup-close"
                    onClick={() => setInfoOpen(false)}
                    aria-label="Hide location details"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                  <p className="location-popup-name">
                    <MapPin size={15} aria-hidden="true" /> {location.name}
                  </p>
                  <p className="location-popup-address">{location.address}</p>
                  <a
                    className="location-popup-link"
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation size={14} aria-hidden="true" /> Directions
                  </a>
                </>
              ) : (
                <button
                  type="button"
                  className="location-popup-open"
                  onClick={() => setInfoOpen(true)}
                >
                  <MapPin size={14} aria-hidden="true" /> Show business details
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="location-map-unavailable" role="status">
            <MapPin size={26} aria-hidden="true" />
            <h3>Map coordinates not published yet</h3>
            <p>
              The exact map pin is set from the admin panel. No approximate or fallback location is
              shown here, so please use the address or contact the team for directions.
            </p>
          </div>
        )}
      </div>

      <div className="location-details">
        <p className="eyebrow">
          <MapPin size={16} aria-hidden="true" /> Business location
        </p>
        <h2 id="location-heading">{location.name}</h2>
        <p>{location.address}</p>
        {location.verificationStatus === "pending" && (
          <p className="location-verification">
            Client-supplied coordinates — business marker pending final confirmation.
          </p>
        )}
        <div className="contact-actions">
          <a
            className="button"
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions <Navigation size={16} aria-hidden="true" />
          </a>
          <a
            className="button button-ghost"
            href={coordinates ? mapsCoordinateUrl(coordinates) : mapsPlaceUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps <ExternalLink size={16} aria-hidden="true" />
          </a>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => void copyAddress()}
          >
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
        <small>
          {coordinates ? (
            <>Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}</>
          ) : (
            <>Coordinates are not configured in the admin panel.</>
          )}
        </small>
      </div>
    </section>
  );
}
