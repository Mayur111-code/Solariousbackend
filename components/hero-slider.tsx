"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import type { HeroBanner } from "@/lib/hero-banners";

type TouchOrigin = { x: number; y: number };

/**
 * Capability highlights shown under the hero CTAs. Wording is drawn from the
 * site's existing pillars so no new company claims are introduced.
 */
const heroHighlights = [
  {
    icon: Sparkles,
    label: "Advanced technology",
    detail: "Modern cell architectures",
  },
  {
    icon: ShieldCheck,
    label: "Premium quality",
    detail: "Traceable quality checks",
  },
  {
    icon: Leaf,
    label: "Sustainable progress",
    detail: "Responsible manufacturing",
  },
] as const;

/**
 * Homepage hero carousel. Autoplay is deliberately slow, pauses on hover,
 * focus and hidden tabs, and never starts for reduced-motion visitors.
 */
export default function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchOrigin = useRef<TouchOrigin | null>(null);

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActive((value) => (value + 1) % banners.length);
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  const current = banners[active] ?? banners[0];
  if (!current) return null;

  // A headline written as two sentences becomes a deliberate two-line
  // composition (e.g. "Beyond Energy." / "Towards a Sustainable Future.")
  // instead of an accidental wrap. Single-sentence headlines are untouched.
  const headlineParts = current.headline.split(/(?<=\.)\s+/).filter(Boolean);
  const headline = headlineParts.length > 1 && current.headline.includes(". ")
    ? <>{headlineParts[0]}<br />{headlineParts.slice(1).join(" ")}</>
    : current.headline;

  const goTo = (index: number) => {
    setActive((index + banners.length) % banners.length);
  };

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      aria-label="Solarious Energy highlights"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        touchOrigin.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const origin = touchOrigin.current;
        const touch = event.changedTouches[0];
        touchOrigin.current = null;
        if (!origin || !touch || banners.length < 2) return;
        const deltaX = touch.clientX - origin.x;
        const deltaY = touch.clientY - origin.y;
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          goTo(active + (deltaX < 0 ? 1 : -1));
        }
      }}
      onKeyDown={(event) => {
        if (banners.length < 2) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(active + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(active - 1);
        }
      }}
    >
      <div className="hero-slides" aria-live="off">
        {banners.map((banner, index) => (
          <div
            className={`hero-slide ${index === active ? "active" : ""}`}
            aria-hidden={index !== active}
            aria-label={`${index + 1} of ${banners.length}`}
            id={`hero-slide-${banner.id}`}
            key={banner.id}
          >
            <Image
              src={banner.image_url || "/hero-solar-1.webp"}
              alt={index === active ? banner.alt_text || `${banner.headline} — Solarious solar installation` : ""}
              fill
              sizes="100vw"
              priority={index === 0}
              onError={(event) => {
                event.currentTarget.src = "/hero-solar-1.webp";
              }}
            />
          </div>
        ))}
      </div>
      <div className="hero-shade" />
      <div className="hero-slider-content">
        <p className="eyebrow hero-eyebrow"><span /> Powering a brighter tomorrow</p>
        <h1 key={`h-${current.id}`}>{headline}</h1>
        <p className="hero-slider-lede" key={`p-${current.id}`}>{current.supporting_text}</p>
        <div className="hero-actions">
          {/* Primary: the catalogue. Secondary: the single enquiry flow. Both
              reuse existing routes — no duplicated products or quote pages. */}
          <Link className="button hero-primary" href="/products">
            Explore Solar Solutions
            <ArrowRight size={18} />
          </Link>
          <Link className="button hero-outline" href="/quote">
            Get a Free Consultation
          </Link>
        </div>
        <div className="hero-highlights">
          {heroHighlights.map(({ icon: Icon, label, detail }) => (
            <span key={label}>
              <Icon size={19} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </span>
          ))}
        </div>
        <Link className="ai-indicator hero-ai hero-events-cta" href="/events">
          <CalendarDays size={16} />
          <span><strong>Events &amp; Activities</strong><small>Explore our latest events, exhibitions &amp; activities</small></span>
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="hero-scroll-cue" aria-hidden="true">
        <span>Scroll to explore</span>
        <i />
      </div>
      {banners.length > 1 && (
        <div className="hero-dots" role="group" aria-label="Choose slide">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              className={index === active ? "active" : ""}
              onClick={() => goTo(index)}
              aria-label={`Show slide ${index + 1}: ${banner.headline}`}
              aria-controls={`hero-slide-${banner.id}`}
              aria-current={index === active ? "true" : undefined}
              type="button"
            />
          ))}
        </div>
      )}
    </section>
  );
}
