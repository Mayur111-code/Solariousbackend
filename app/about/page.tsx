import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";
import CompanyDocumentsSection from "@/components/company-documents-section";
import PageShell from "@/components/page-shell";
import PartnerLogoShowcase from "@/components/partner-logo-showcase";
import TeamSection from "@/components/team-section";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getAboutCms, getBrandingCms, getCompanyCms } from "@/lib/site-cms";
import { getCompanyDocuments } from "@/lib/resources";
import { getTeamMembers } from "@/lib/team";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Solarious Energy, its mission, manufacturing focus and company values.",
  alternates: { canonical: "/about" },
};

export default async function Page() {
  const [content, company, branding, teamMembers, documents] = await Promise.all([
    getAboutCms(),
    getCompanyCms(),
    getBrandingCms(),
    getTeamMembers(),
    getCompanyDocuments(),
  ]);

  return (
    <PageShell
      {...PUBLIC_HERO_PRESETS.about}
      eyebrow={content.eyebrow}
      title={company.aboutHeading || content.title}
      intro={company.companyProfile || content.intro}
      image={content.heroImage || PUBLIC_HERO_PRESETS.about.image}
    >
      <section className="content-section about-identity" aria-labelledby="about-identity-heading">
        <div className="about-identity-intro">
          <p className="premium-kicker">{company.companyName}</p>
          <h2 id="about-identity-heading">
            Manufacturing discipline, <em>engineering clarity.</em>
          </h2>
          <p>{company.description}</p>
          <p>
            {company.legalName} publishes only information it can support with approved records.
            Product specifications, capacity figures and certifications are shared from source
            documents on request.
          </p>
          <div className="about-identity-actions">
            <Link className="button" href="/products">
              Explore products <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="button button-ghost" href="/quote">
              Request a quote
            </Link>
          </div>
        </div>
        <dl className="about-identity-facts">
          <div>
            <dt>
              <ShieldCheck size={16} aria-hidden="true" /> Quality focus
            </dt>
            <dd>Structured inspection and traceable production records</dd>
          </div>
          <div>
            <dt>
              <Sparkles size={16} aria-hidden="true" /> Technology
            </dt>
            <dd>Mono PERC, TOPCon, HJT and bifacial module categories</dd>
          </div>
          <div>
            <dt>
              <FileText size={16} aria-hidden="true" /> Documentation
            </dt>
            <dd>Published records available to preview below</dd>
          </div>
        </dl>
      </section>

      <section className="content-section" aria-labelledby="about-values-heading">
        <h2 id="about-values-heading" className="visually-hidden">
          Company pillars
        </h2>
        <div className="content-grid">
          {content.sections.map((section, index) => (
            <article className="content-card" key={`${section.title}-${index}`}>
              {section.imageUrl && <img src={section.imageUrl} alt="" loading="lazy" />}
              <CheckCircle2 size={22} aria-hidden="true" />
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <PartnerLogoShowcase logos={branding.partnerLogoUrls} />

      {content.timeline.length > 0 && (
        <section className="content-section about-timeline" aria-labelledby="journey-title">
          <p className="eyebrow">Company roadmap</p>
          <h2 id="journey-title">Our Journey</h2>
          <div>
            {content.timeline.map((item, index) => (
              <article key={`${item.year}-${index}`}>
                {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}
                <strong>{item.year}</strong>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <TeamSection initialMembers={teamMembers} />

      <CompanyDocumentsSection initialResources={documents} />
    </PageShell>
  );
}
