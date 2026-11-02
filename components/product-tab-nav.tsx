"use client";

/**
 * Sticky section navigation for the product detail page.
 *
 * · buttons scroll to the matching section (CSS `scroll-margin-top` keeps the
 *   heading clear of the sticky header + this bar),
 * · an IntersectionObserver highlights whichever section is in view,
 * · on narrow screens the strip scrolls horizontally and the active tab is
 *   nudged into view — no page-level horizontal scrolling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type ProductTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export default function ProductTabNav({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(() => tabs[0]?.id ?? "");
  const stripRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const targets = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      /* Top margin clears the sticky header + tab bar; the bottom margin makes
         the "current" section the one occupying the upper half of the viewport. */
      { rootMargin: "-150px 0px -52% 0px", threshold: [0, 0.2, 0.5] },
    );

    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [tabs]);

  /* Keep the active chip visible inside the horizontally scrollable strip. */
  useEffect(() => {
    const node = stripRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (!node) return;
    node.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [active, reduced]);

  const goTo = useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      setActive(id);
      /* Move focus for keyboard users without a second jump. */
      target.focus({ preventScroll: true });
    },
    [reduced],
  );

  if (!tabs.length) return null;

  return (
    <div className="ps-tabbar">
      <div className="ps-tabbar-inner" ref={stripRef} role="tablist" aria-label="Product sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={tab.id}
              data-active={isActive}
              className={`ps-tab${isActive ? " is-active" : ""}`}
              onClick={() => goTo(tab.id)}
            >
              {isActive && !reduced ? (
                <motion.span
                  layoutId="ps-tab-pill"
                  className="ps-tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
