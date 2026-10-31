"use client";

import { useState } from "react";

const FALLBACK_IMAGE = "/utility-solar.webp";

/**
 * Product imagery strip. Kept as a client component only so a broken remote
 * image can fall back to the local placeholder without a visible broken icon.
 */
export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [sources, setSources] = useState(images);

  return (
    <div className="product-gallery-grid" data-count={sources.length}>
      {sources.map((source, index) => (
        <figure key={`${source}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source}
            alt={`${name} module imagery ${index + 1}`}
            loading="lazy"
            decoding="async"
            onError={() =>
              setSources((current) => {
                if (current[index] === FALLBACK_IMAGE) return current;
                const next = [...current];
                next[index] = FALLBACK_IMAGE;
                return next;
              })
            }
          />
        </figure>
      ))}
    </div>
  );
}
