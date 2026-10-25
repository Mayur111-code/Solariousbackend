"use client";

import { Check, Copy, ExternalLink, MapPin } from "lucide-react";
import { useState } from "react";

export type BusinessLocation = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  verificationStatus?: "verified" | "pending";
};

export default function LocationMap({ location }: { location: BusinessLocation }) {
  const [copied, setCopied] = useState(false);
  const query = `${location.latitude},${location.longitude}`;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  async function copyAddress() {
    await navigator.clipboard.writeText(location.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <section className="location-panel" aria-labelledby="location-heading">
    <div className="location-map-frame">
      <iframe title={`Map showing ${location.name}`} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
    <div className="location-details">
      <p className="eyebrow"><MapPin size={16}/> Business location</p>
      <h2 id="location-heading">{location.name}</h2>
      <p>{location.address}</p>
      {location.verificationStatus === "pending" && <p className="location-verification">Client-supplied coordinates - business marker pending final confirmation.</p>}
      <div className="contact-actions">
        <a className="button" href={location.mapsUrl} target="_blank" rel="noreferrer">Get directions <ExternalLink size={16}/></a>
        <button className="button button-ghost" type="button" onClick={() => void copyAddress()}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Copied" : "Copy address"}</button>
      </div>
      <small>Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</small>
    </div>
  </section>;
}
