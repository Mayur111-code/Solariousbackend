import Image from "next/image";

/**
 * Client and partner logo showcase for the About page.
 *
 * Only logo URLs that an administrator has published under
 * Admin → Website Content → Branding are rendered. Nothing is hardcoded and no
 * partnership is implied: when the list is empty the section is not rendered at
 * all, so the site never shows invented clients.
 */
export default function PartnerLogoShowcase({
  logos = [],
  heading = "Trusted by project partners",
  description = "Developers, EPC contractors and channel partners who work with Solarious Energy modules.",
}: {
  logos?: string[];
  heading?: string;
  description?: string;
}) {
  const published = logos
    .map((logo) => String(logo || "").trim())
    .filter(Boolean)
    .slice(0, 24);

  if (!published.length) return null;

  return (
    <section className="partner-logos" aria-labelledby="partner-logos-heading">
      <header>
        <p className="premium-kicker">Clients &amp; partners</p>
        <h2 id="partner-logos-heading">{heading}</h2>
        <p>{description}</p>
      </header>
      <ul className="partner-logo-grid">
        {published.map((logo, index) => (
          <li key={`${logo}-${index}`}>
            <Image
              src={logo}
              alt=""
              width={220}
              height={90}
              sizes="(max-width: 560px) 45vw, (max-width: 960px) 30vw, 200px"
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
