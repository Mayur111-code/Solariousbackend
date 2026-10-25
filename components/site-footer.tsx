import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, MessageCircle } from "lucide-react";
import type { CompanyCms } from "@/lib/site-cms";

const groups = [
  {
    title: "Company",
    links: [
      ["About Us", "/about"],
      ["Manufacturing", "/manufacturing"],
      ["Sustainability", "/sustainability"],
    ],
  },
  {
    title: "Products",
    links: [
      ["Mono PERC", "/products/mono-perc"],
      ["TOPCon", "/products/topcon"],
      ["HJT", "/products/hjt"],
      ["Bifacial", "/products/bifacial"],
    ],
  },
  {
    title: "Explore",
    links: [
      ["Company Documents", "/about#company-documents"],
      ["Solar Calculator", "/solar-calculator"],
      ["Compare Modules", "/compare"],
      ["Quality", "/quality"],
    ],
  },
  {
    title: "Contact",
    links: [
      ["Request Quote", "/quote"],
      ["Contact", "/contact"],
      ["Find a Module", "/module-recommender"],
      ["Projects", "/projects"],
    ],
  },
];
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.32 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.1 20.45H3.54V9H7.1v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
  </svg>
);

export default function SiteFooter({
  logoUrl = "/solarious-logo.png",
  company,
}: {
  logoUrl?: string;
  company: CompanyCms;
}) {
  const whatsapp = company.whatsapp.replace(/\D/g, "");
  const socialLinks = Object.entries(company.social).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return (
    <footer className="site-footer">
      <section className="footer-brand" aria-label="Company information">
        <p className="footer-kicker">Company Information</p>
        <Image
          src={logoUrl}
          alt="Solarious Energy"
          width={300}
          height={100}
        />
        <p className="footer-tagline">{company.tagline}</p>
        <p>{company.footerDescription || company.description}</p>
        <p className="footer-address">{company.registeredOffice}</p>
        {company.primaryPhone && <a href={`tel:${company.primaryPhone}`}>{company.primaryPhone}</a>}
        <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a>
        <a href={company.websiteUrl} target="_blank" rel="noreferrer">
          {company.website}
        </a>
        <div className="footer-socials" aria-label="Company links">
          <a
            href={`mailto:${company.generalEmail}`}
            aria-label="Email Solarious Energy"
          >
            <Mail size={17} />
          </a>
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Solarious Energy website"
          >
            <Globe size={17} />
          </a>
          {whatsapp && <a
            href={`https://wa.me/${whatsapp}?text=Hello%20Solarious%20Energy%2C%20I%20would%20like%20to%20discuss%20a%20solar%20requirement.`}
            target="_blank"
            rel="noreferrer"
            aria-label="Contact Solarious Energy on WhatsApp"
          >
            <MessageCircle size={17} />
          </a>}
          {socialLinks.map(([network,href])=><a key={network} href={href} target="_blank" rel="noreferrer" aria-label={`Visit Solarious Energy on ${network}`}>
            {network==="linkedin"?<LinkedInIcon/>:<Globe size={17}/>}
          </a>)}
        </div>
      </section>
      {groups.map((group) => (
        <nav
          className="footer-group"
          key={group.title}
          aria-label={`${group.title} links`}
        >
          <h2>{group.title}</h2>
          {group.links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      ))}
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {company.legalName}. All rights reserved.
        </span>
        <span>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
          <Link
            className="footer-admin-button"
            href="/admin"
            prefetch={false}
            aria-label="Open Admin Login"
          >
            Admin Login
          </Link>
        </span>
      </div>
    </footer>
  );
}
