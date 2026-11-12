"use client";

/* Remote catalogue imagery is user-supplied and sized by CSS; next/image cannot
   optimise unknown admin hosts without a loader. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

const FALLBACK_IMAGE = "/utility-solar.webp";

export default function ProductImageGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const sources = images.length ? images : [FALLBACK_IMAGE];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const move = useCallback(
    (direction: number) =>
      setIndex((current) => (current + direction + sources.length) % sources.length),
    [sources.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, move]);

  useEffect(() => {
    if (!open) openerRef.current?.focus({ preventScroll: true });
  }, [open]);

  const srcAt = (position: number) =>
    failed[position] ? FALLBACK_IMAGE : sources[position] || FALLBACK_IMAGE;

  return (
    <div className="ps-gallery">
      <figure
        className={`ps-gallery-main${sources.length > 1 ? " has-controls" : ""}`}
      >
        <img
          src={srcAt(index)}
          alt={`${name} — image ${index + 1} of ${sources.length}`}
          decoding="async"
          onError={() => setFailed((current) => ({ ...current, [index]: true }))}
        />
        <button
          type="button"
          className="ps-gallery-expand"
          ref={openerRef}
          onClick={() => setOpen(true)}
          aria-label={`Open ${name} gallery in full screen`}
        >
          <Expand size={16} aria-hidden="true" />
          <span>Expand</span>
        </button>
        {sources.length > 1 ? (
          <div className="ps-gallery-controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous image">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span aria-live="polite">
              {index + 1} / {sources.length}
            </span>
            <button type="button" onClick={() => move(1)} aria-label="Next image">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </figure>

      {sources.length > 1 ? (
        <ul className="ps-gallery-thumbs" aria-label={`${name} images`}>
          {sources.map((source, position) => (
            <li key={`${source}-${position}`}>
              <button
                type="button"
                className={position === index ? "is-active" : ""}
                onClick={() => setIndex(position)}
                aria-label={`Show image ${position + 1}`}
                aria-current={position === index ? "true" : undefined}
              >
                        <img src={srcAt(position)} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div
          className="ps-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} image gallery`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            className="ps-lightbox-close"
            onClick={() => setOpen(false)}
            ref={closeRef}
            aria-label="Close gallery"
          >
            <X size={20} aria-hidden="true" />
          </button>
          {sources.length > 1 ? (
            <button
              type="button"
              className="ps-lightbox-nav is-prev"
              onClick={() => move(-1)}
              aria-label="Previous image"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          ) : null}
            <img
            className="ps-lightbox-image"
            src={srcAt(index)}
            alt={`${name} — enlarged image ${index + 1}`}
          />
          {sources.length > 1 ? (
            <button
              type="button"
              className="ps-lightbox-nav is-next"
              onClick={() => move(1)}
              aria-label="Next image"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          ) : null}
          <p className="ps-lightbox-caption">
            {name} · image {index + 1} of {sources.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}
