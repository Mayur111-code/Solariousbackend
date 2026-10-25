"use client";

import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SiteGalleryImage } from "@/lib/gallery";

const labels: Record<string, string> = {
  "Residential Solar": "Residential",
  "Commercial Solar": "Commercial",
  "Industrial Solar": "Industrial",
  "Installation Projects": "Installation",
  "Solar Products": "Products",
  "Events & Activities": "Events",
};

function thumbnail(url: string) {
  return url.includes("res.cloudinary.com")
    ? url.replace("/upload/", "/upload/f_auto,q_auto,w_700,c_fill/")
    : url;
}

export default function PublicGallery({ images }: { images: SiteGalleryImage[] }) {
  const [category, setCategory] = useState("All Photos");
  const [current, setCurrent] = useState<number | null>(null);

  const categories = useMemo(
    () => ["All Photos", ...Array.from(new Set(images.map((image) => image.category)))],
    [images],
  );
  const visible = useMemo(
    () => (category === "All Photos" ? images : images.filter((image) => image.category === category)),
    [images, category],
  );
  const selected = current === null ? null : visible[current];

  const fallback = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = "/hero-solar-4.webp";
  };
  const move = (by: number) => {
    setCurrent((index) => (index === null ? null : (index + by + visible.length) % visible.length));
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!selected) return;
      if (event.key === "Escape") setCurrent(null);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, visible.length]);

  return (
    <>
      <div className="gallery-filters" aria-label="Gallery category filters">
        {categories.map((value) => (
          <button
            key={value}
            className={value === category ? "active" : ""}
            onClick={() => {
              setCategory(value);
              setCurrent(null);
            }}
          >
            {labels[value] || value}
          </button>
        ))}
      </div>

      {visible.length ? (
        <div className="public-gallery">
          {visible.map((image, index) => (
            <button
              key={image.id}
              className="gallery-card"
              onClick={() => setCurrent(index)}
              aria-label={`Open ${image.title || image.alt_text}`}
            >
              <img
                src={thumbnail(image.image_url)}
                alt={image.alt_text || image.title || "Solarious gallery image"}
                loading="lazy"
                onError={fallback}
              />
              <span className="gallery-category">{labels[image.category] || image.category}</span>
              <span className="gallery-copy"><strong>{image.title || "Solarious Energy"}</strong></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="gallery-empty">No published photos are available in this category yet.</div>
      )}

      {selected && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title || "Gallery image"}
          onMouseDown={() => setCurrent(null)}
        >
          <div className="gallery-lightbox-inner" onMouseDown={(event) => event.stopPropagation()}>
            <button className="gallery-close" onClick={() => setCurrent(null)} aria-label="Close image viewer"><X /></button>
            {visible.length > 1 && <button className="gallery-arrow previous" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft /></button>}
            <img
              src={selected.image_url}
              alt={selected.alt_text || selected.title || "Solarious gallery image"}
              onError={fallback}
            />
            <div>
              <span>{labels[selected.category] || selected.category}</span>
              <h2>{selected.title || "Solarious Energy"}</h2>
              {selected.description && <p>{selected.description}</p>}
            </div>
            {visible.length > 1 && <button className="gallery-arrow next" onClick={() => move(1)} aria-label="Next image"><ChevronRight /></button>}
          </div>
        </div>
      )}
    </>
  );
}
