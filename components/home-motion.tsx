"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-driven storytelling for the homepage.
 *
 * GSAP + ScrollTrigger are loaded only in the browser, so the server-rendered
 * page is complete and readable before JavaScript runs. Every animation is
 * skipped for visitors who prefer reduced motion, and the whole context is
 * reverted on unmount so client-side navigation never leaks triggers.
 */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const progress = node.querySelector<HTMLElement>(".future-scroll-progress");
        if (progress) {
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: document.documentElement,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );
        }

        /* Hero entrance -------------------------------------------------- */
        gsap.from(
          [
            ".hero-eyebrow",
            ".hero-slider-content h1",
            ".hero-slider-lede",
            ".hero-actions",
            ".hero-highlights",
            ".hero-scroll-cue",
          ],
          {
            y: 34,
            opacity: 0,
            duration: 1.05,
            stagger: 0.09,
            ease: "power3.out",
            delay: 0.12,
          },
        );

        gsap.to(".hero-scroll-cue i", {
          scaleY: 1.35,
          opacity: 0.45,
          repeat: -1,
          yoyo: true,
          duration: 1.8,
          ease: "sine.inOut",
        });

        /* Generic section reveals --------------------------------------- */
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 42,
            opacity: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              once: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
          const items = group.querySelectorAll<HTMLElement>("[data-reveal-item]");
          if (!items.length) return;
          gsap.from(items, {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.09,
            ease: "power3.out",
            scrollTrigger: {
              trigger: group,
              start: "top 84%",
              once: true,
            },
          });
        });

        /* Problem → solution: the two panels meet from opposite sides ---- */
        const split = node.querySelector<HTMLElement>("[data-split]");
        if (split) {
          const challenge = split.querySelector<HTMLElement>(".future-challenge");
          const solution = split.querySelector<HTMLElement>(".future-solution");
          const panels = [challenge, solution].filter((panel): panel is HTMLElement => Boolean(panel));
          if (panels.length) {
            gsap.from(panels, {
              x: (index) => (index === 0 ? -42 : 42),
              opacity: 0,
              duration: 0.9,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: {
                trigger: split,
                start: "top 82%",
                once: true,
              },
            });
          }
        }

        /* Gentle image parallax ----------------------------------------- */
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((frame) => {
          const image = frame.querySelector<HTMLElement>("img");
          if (!image) return;
          gsap.fromTo(
            image,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });

        /* Product and editorial image scale ----------------------------- */
        gsap.utils.toArray<HTMLElement>("[data-cinema]").forEach((frame) => {
          const image = frame.querySelector<HTMLElement>("img");
          if (!image) return;
          gsap.fromTo(
            image,
            { scale: 1.16 },
            {
              scale: 1.01,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            },
          );
        });
      }, node);

      /* Pinned cinematic story — desktop only. -------------------------- */
      const media = gsap.matchMedia();
      media.add("(min-width: 1024px)", () => {
        const story = node.querySelector<HTMLElement>(".future-story");
        if (!story) return;
        const image = story.querySelector<HTMLElement>("img");
        const copy = story.querySelector<HTMLElement>(".future-story-copy");
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: story,
            start: "top top",
            end: "+=75%",
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
          },
        });
        if (image) {
          timeline.fromTo(
            image,
            { scale: 1.24, yPercent: -3 },
            { scale: 1.02, yPercent: 0, ease: "none" },
            0,
          );
        }
        if (copy) {
          // Motion only — the copy never starts invisible, so the story stays
          // readable even if the scrub is interrupted mid-scroll.
          timeline.fromTo(
            copy,
            { y: 56 },
            { y: 0, ease: "power2.out", duration: 0.6 },
            0,
          );
        }
      });

      ScrollTrigger.refresh();
      void document.fonts?.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
      cleanup = () => {
        media.revert();
        context.revert();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <main ref={root} className="premium-home future-home">
      <span className="future-scroll-progress" aria-hidden="true" />
      {children}
    </main>
  );
}
