"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Menu, Phone, Sun } from "lucide-react";
import LeadFormModal from "@/components/lead-form-modal";
import type { CompanyCms } from "@/lib/site-cms";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Public navigation. Manufacturing and Projects were withdrawn from the public
 * UI; their routes now issue permanent redirects so shared links and search
 * results keep working. Content, records and admin modules are untouched.
 */
const primaryStart = [
  ["Home", "/"],
  ["About", "/about"],
  ["Services", "/services"],
] as const;
const primaryMiddle = [
  ["Gallery", "/gallery"],
] as const;
const primaryEnd = [["Contact", "/contact"]] as const;
const productLinks = [
  ["All Products", "/products"],
  ["Mono PERC", "/products/mono-perc"],
  ["TOPCon", "/products/topcon"],
  ["HJT", "/products/hjt"],
  ["Bifacial", "/products/bifacial"],
] as const;
const solutionLinks = [
  ["Request a Commercial Quote", "/quote"],
  ["Certifications & Bankability", "/certifications"],
  ["Solar Savings Calculator", "/solar-calculator"],
  ["Find My Solar Solution", "/module-recommender"],
  ["Compare Modules", "/compare"],
] as const;

const current = (pathname: string, href: string) =>
  href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

const LinkedInMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="15" height="15">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.32 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.1 20.45H3.54V9H7.1v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
  </svg>
);

function TopContactBar({ company }: { company: CompanyCms }) {
  const socials = Object.entries(company.social || {}).filter(([, href]) => Boolean(href));
  return (
    <div className="top-bar">
      <div className="top-bar-inner">
        <p className="top-bar-tagline">
          <Sun size={14} aria-hidden="true" />
          {company.tagline}
        </p>
        <div className="top-bar-contact">
          {company.primaryPhone ? (
            <a href={`tel:${company.primaryPhone}`}>
              <Phone size={13} aria-hidden="true" />
              {company.primaryPhone}
            </a>
          ) : null}
          <a className="top-bar-email" href={`mailto:${company.generalEmail}`}>
            <Mail size={13} aria-hidden="true" />
            {company.generalEmail}
          </a>
          {socials.length > 0 && (
            <div className="top-bar-socials">
              {socials.map(([network, href]) => (
                <a
                  key={network}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Solarious Energy on ${network}`}
                >
                  {network === "linkedin" ? <LinkedInMark /> : <Sun size={14} />}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = current(pathname, href);
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = current(pathname, href);
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className={active ? "active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    </SheetClose>
  );
}

function DesktopMenu({
  label,
  links,
  open,
  setOpen,
  active,
}: {
  label: string;
  links: readonly (readonly [string, string])[];
  open: boolean;
  setOpen: (value: boolean) => void;
  active: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    enter = () => {
      if (timer.current) clearTimeout(timer.current);
      setOpen(true);
    },
    leave = () => {
      timer.current = setTimeout(() => setOpen(false), 100);
    };
  return (
    <div
      className={`nav-hover-menu ${open ? "open" : ""} ${active ? "active" : ""}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        type="button"
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <div className="nav-menu-panel">
        {links.map(([text, href]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>
            {text}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SiteHeader({
  logoUrl = "/solarious-logo.png",
  company,
}: {
  logoUrl?: string;
  alternateLogoUrl?: string;
  company?: CompanyCms;
}) {
  const pathname = usePathname(),
    home = pathname === "/";
  const [scrolled, setScrolled] = useState(false),
    [menu, setMenu] = useState<string | null>(null),
    [mobile, setMobile] = useState<string | null>(null),
    [drawerOpen, setDrawerOpen] = useState(false);

  /* The redesigned navigation is an opaque white bar on every route, so the
     standard (dark-on-light) logo is the correct mark everywhere — including
     the drawer header, which places it on a white chip. The alternateLogoUrl
     prop is still accepted for CMS compatibility but is no longer needed. */
  const activeLogo = logoUrl;

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
        if (event.key === "Escape") setMenu(null);
      },
      scroll = () =>
        setScrolled((previous) =>
          previous ? window.scrollY > 24 : window.scrollY > 72,
        );
    scroll();
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", scroll);
    };
  }, []);

  return (
    <>
      {company ? <TopContactBar company={company} /> : null}
      <header
        className={`site-header global-header ${home ? "home-header" : ""} ${scrolled ? "scrolled" : ""}`}
      >
        <Link href="/" className="brand" aria-label="Solarious Energy home">
          <Image
            src={activeLogo}
            alt="Solarious Energy"
            width={300}
            height={100}
            priority
          />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryStart.map(([label, href]) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} />
          ))}
          <DesktopMenu
            label="Products"
            links={productLinks}
            open={menu === "products"}
            setOpen={(value) => setMenu(value ? "products" : null)}
            active={pathname.startsWith("/products")}
          />
          {primaryMiddle.map(([label, href]) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} />
          ))}
          <DesktopMenu
            label="Solutions"
            links={solutionLinks}
            open={menu === "solutions"}
            setOpen={(value) => setMenu(value ? "solutions" : null)}
            active={solutionLinks.some(([, href]) => current(pathname, href))}
          />
          <NavLink href="/contact" label="Contact" pathname={pathname} />
        </nav>
        <LeadFormModal label="Get a quote" className="button button-small" />
        <Sheet
          open={drawerOpen}
          onOpenChange={(value) => {
            setDrawerOpen(value);
            if (!value) setMobile(null);
          }}
        >
          <SheetTrigger asChild>
            <button className="menu-button" aria-label="Open navigation">
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="mobile-sheet">
            <SheetHeader className="mobile-sheet-header">
              <Image
                src={logoUrl}
                alt="Solarious Energy"
                width={220}
                height={74}
              />
              <SheetTitle className="sr-only">
                Solarious Energy navigation
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile navigation">
              {primaryStart.map(([label, href]) => (
                <MobileLink
                  key={href}
                  href={href}
                  label={label}
                  pathname={pathname}
                />
              ))}
              <button
                className="mobile-nav-toggle"
                aria-expanded={mobile === "products"}
                onClick={() =>
                  setMobile(mobile === "products" ? null : "products")
                }
                type="button"
              >
                Products
                <ChevronDown />
              </button>
              {mobile === "products" && (
                <div className="mobile-subnav">
                  {productLinks.map(([label, href]) => (
                    <MobileLink
                      key={href}
                      href={href}
                      label={label}
                      pathname={pathname}
                    />
                  ))}
                </div>
              )}
              {primaryMiddle.map(([label, href]) => (
                <MobileLink
                  key={href}
                  href={href}
                  label={label}
                  pathname={pathname}
                />
              ))}
              <button
                className="mobile-nav-toggle"
                aria-expanded={mobile === "solutions"}
                onClick={() =>
                  setMobile(mobile === "solutions" ? null : "solutions")
                }
                type="button"
              >
                Solutions
                <ChevronDown />
              </button>
              {mobile === "solutions" && (
                <div className="mobile-subnav">
                  {solutionLinks.map(([label, href]) => (
                    <MobileLink
                      key={href}
                      href={href}
                      label={label}
                      pathname={pathname}
                    />
                  ))}
                </div>
              )}
              {primaryEnd.map(([label, href]) => (
                <MobileLink
                  key={href}
                  href={href}
                  label={label}
                  pathname={pathname}
                />
              ))}
              <LeadFormModal
                label="Get a quote"
                className="button mobile-quote-button"
              />
            </nav>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
