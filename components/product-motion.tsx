"use client";

/**
 * Motion primitives for the product pages.
 *
 * Framer Motion is used for four things only — hero entrance, section reveal on
 * scroll, tab indicator, and gallery cross-fade. Everything else is CSS so the
 * pages stay light. `useReducedMotion` short-circuits every animation for users
 * who ask for reduced motion, and the CSS layer has its own reduced-motion
 * block as a second line of defence.
 */

import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { ElementType, ReactNode } from "react";

const EASE = [0.22, 0.61, 0.36, 1] as const;

const baseTransition: Transition = { duration: 0.55, ease: EASE };

type Tag = "div" | "section" | "article" | "ul" | "li";

function motionTag(tag: Tag): ElementType {
  if (tag === "section") return motion.section;
  if (tag === "article") return motion.article;
  if (tag === "ul") return motion.ul;
  if (tag === "li") return motion.li;
  return motion.div;
}

type RevealProps = {
  children: ReactNode;
  /** Rendered as the given element so wrapper divs never break layout. */
  as?: Tag;
  className?: string;
  id?: string;
  /** Seconds of stagger delay, used for grids of cards. */
  delay?: number;
  /** Travel distance in px; keep small so nothing feels bouncy. */
  y?: number;
  amount?: number;
};

export function Reveal({
  children,
  as = "div",
  className,
  id,
  delay = 0,
  y = 22,
  amount = 0.14,
}: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = reduced ? as : motionTag(as);

  if (reduced) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} id={id}>
        {children}
      </Plain>
    );
  }

  const Motion = Tag as ElementType;
  return (
    <Motion
      className={className}
      id={id}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: "0px 0px -70px 0px" }}
      transition={{ ...baseTransition, delay }}
    >
      {children}
    </Motion>
  );
}

/**
 * Hero entrance. Children fade/rise in sequence; the whole group is a single
 * animation tree so the page never reflows more than once.
 */
export function HeroReveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...baseTransition, delay, duration: 0.7 }}
    >
      {children}
    </motion.div>
  );
}

/** Cross-fade used by the gallery when the active image changes. */
export function FadeSwap({
  children,
  className,
  /** Changes to this key restart the cross-fade. */
  swapKey,
}: {
  children: ReactNode;
  className?: string;
  swapKey: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      key={swapKey}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
