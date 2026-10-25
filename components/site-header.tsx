"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import LeadFormModal from "@/components/lead-form-modal";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
const primary = [
  ["Home", "/"],
  ["About", "/about"],
  ["Services", "/services"],
  ["Manufacturing", "/manufacturing"],
  ["Projects", "/projects"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
] as const;
const productLinks = [
  ["All Products", "/products"],
  ["Mono PERC", "/products/mono-perc"],
  ["TOPCon", "/products/topcon"],
  ["HJT", "/products/hjt"],
  ["Bifacial", "/products/bifacial"],
] as const;
const solutionLinks = [
  ["Solar Savings Calculator", "/solar-calculator"],
  ["Find My Solar Solution", "/module-recommender"],
  ["Compare Modules", "/compare"],
] as const;
const current = (pathname: string, href: string) =>
  href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
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
      timer.current = setTimeout(() => setOpen(false), 90);
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
      >
        {label}
        <ChevronDown size={14} />
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
  alternateLogoUrl = "/solarious-logo.png",
}: {
  logoUrl?: string;
  alternateLogoUrl?: string;
}) {
  const pathname = usePathname(),
    home = pathname === "/";
  const [scrolled, setScrolled] = useState(false),
    [menu, setMenu] = useState<string | null>(null),
    [mobile, setMobile] = useState<string | null>(null),
    [drawerOpen, setDrawerOpen] = useState(false);
  const activeLogo = home && !scrolled ? alternateLogoUrl : logoUrl;
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
        <NavLink href="/" label="Home" pathname={pathname} />
        <NavLink href="/about" label="About" pathname={pathname} />
        <NavLink href="/services" label="Services" pathname={pathname} />
        <DesktopMenu
          label="Products"
          links={productLinks}
          open={menu === "products"}
          setOpen={(value) => setMenu(value ? "products" : null)}
          active={pathname.startsWith("/products")}
        />
        <NavLink
          href="/manufacturing"
          label="Manufacturing"
          pathname={pathname}
        />
        <NavLink href="/projects" label="Projects" pathname={pathname} />
        <NavLink href="/gallery" label="Gallery" pathname={pathname} />
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
              src={activeLogo}
              alt="Solarious Energy"
              width={220}
              height={74}
            />
            <SheetTitle className="sr-only">
              Solarious Energy navigation
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Mobile navigation">
            {primary.slice(0, 3).map(([label, href]) => (
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
            {primary.slice(3, 6).map(([label, href]) => (
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
            {primary.slice(6).map(([label, href]) => (
              <MobileLink
                key={href}
                href={href}
                label={label}
                pathname={pathname}
              />
            ))}
            <LeadFormModal label="Get a quote" className="button mobile-quote-button" />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
