import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  DEFAULT_PUBLIC_HERO_IMAGE,
  type HeroBreadcrumbItem,
  type HeroCta,
  type PublicHeroOptions,
} from "@/lib/public-hero";

export type PublicHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
} & PublicHeroOptions;

type BreadcrumbProps = {
  breadcrumb: PublicHeroProps["breadcrumb"];
  title: string;
};

function Breadcrumb({ breadcrumb, title }: BreadcrumbProps) {
  if (breadcrumb === false) return null;
  const items: HeroBreadcrumbItem[] = Array.isArray(breadcrumb)
    ? breadcrumb
    : [{ label: typeof breadcrumb === "string" ? breadcrumb : title }];
  return (
    <nav className="hero-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item, index) => (
        <span className="hero-breadcrumb-item" key={`${item.label}-${index}`}>
          <ChevronRight size={14} aria-hidden="true" />
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function HeroCtaLink({ cta }: { cta: HeroCta }) {
  const variant = cta.variant ?? "primary";
  const showArrow = cta.icon === "arrow" || (!cta.icon && variant === "primary");
  const external = cta.external ?? /^(https?:|mailto:|tel:)/i.test(cta.href);
  const opensNewTab = cta.external ?? /^https?:/i.test(cta.href);
  const className = `button ${variant === "secondary" ? "hero-outline" : ""}`.trim();
  const content = (
    <>
      {cta.label}
      {showArrow && <ArrowRight size={18} aria-hidden="true" />}
    </>
  );
  if (external) {
    return (
      <a
        className={className}
        href={cta.href}
        aria-label={cta.ariaLabel}
        target={opensNewTab ? "_blank" : undefined}
        rel={opensNewTab ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }
  return (
    <Link className={className} href={cta.href} aria-label={cta.ariaLabel}>
      {content}
    </Link>
  );
}

function allowedHeroImage(image?: string): string {
  if (!image) return DEFAULT_PUBLIC_HERO_IMAGE;
  if (image.startsWith("/") || /^https:\/\/res\.cloudinary\.com\//i.test(image)) {
    return image;
  }
  return DEFAULT_PUBLIC_HERO_IMAGE;
}

/**
 * Shared full-width image hero for public internal pages. The homepage keeps
 * its dedicated carousel, but uses the same overlay and typography language.
 */
export default function InnerPageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt = "",
  imagePosition = "center",
  mobileImagePosition,
  overlay = "medium",
  align = "left",
  compact = false,
  breadcrumb,
  primaryCta,
  secondaryCta,
  actions,
  children,
  className = "",
  priority = true,
}: PublicHeroProps) {
  const sectionStyle = {
    "--public-hero-position": imagePosition,
    "--public-hero-position-mobile": mobileImagePosition ?? imagePosition,
  } as CSSProperties;
  const ctas = [
    primaryCta && { ...primaryCta, variant: primaryCta.variant ?? "primary" },
    secondaryCta && { ...secondaryCta, variant: secondaryCta.variant ?? "secondary" },
  ].filter(Boolean) as HeroCta[];
  const hasActions = ctas.length > 0 || Boolean(actions);
  const classes = [
    "premium-inner-hero",
    "public-hero",
    `overlay-${overlay}`,
    `hero-align-${align}`,
    compact ? "public-hero-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} style={sectionStyle}>
      <div className="public-hero-media" aria-hidden="true">
        <Image
          src={allowedHeroImage(image)}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="100vw"
        />
      </div>
      <div className="public-hero-overlay" aria-hidden="true" />
      <div className="public-hero-inner">
        <div className="public-hero-copy">
          <Breadcrumb breadcrumb={breadcrumb} title={title} />
          <p className="eyebrow">
            <span aria-hidden="true" /> {eyebrow}
          </p>
          <h1>{title}</h1>
          <p className="public-hero-description">{description}</p>
          {hasActions && (
            <div className="hero-actions public-hero-actions">
              {ctas.map((cta) => (
                <HeroCtaLink cta={cta} key={`${cta.label}-${cta.href}`} />
              ))}
              {actions}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
