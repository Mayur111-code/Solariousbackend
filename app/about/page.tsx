import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element */
import { CheckCircle2 } from "lucide-react";
import CompanyDocumentsSection from "@/components/company-documents-section";
import PageShell from "@/components/page-shell";
import TeamSection from "@/components/team-section";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getAboutCms, getCompanyCms } from "@/lib/site-cms";
import { getCompanyDocuments } from "@/lib/resources";
import { getTeamMembers } from "@/lib/team";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Solarious Energy, its mission, manufacturing focus and company values.",
};

export default async function Page() {
  const [content, company, teamMembers, documents] = await Promise.all([
    getAboutCms(),
    getCompanyCms(),
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
      <section className="content-section">
        <div className="content-grid">
          {content.sections.map((section, index) => (
            <article className="content-card" key={`${section.title}-${index}`}>
              {section.imageUrl && <img src={section.imageUrl} alt="" loading="lazy" />}
              <span>{String(index + 1).padStart(2, "0")}</span>
              <CheckCircle2 size={22} />
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
        {content.timeline.length > 0 && (
          <section className="about-timeline" aria-labelledby="journey-title">
            <p className="eyebrow">Company roadmap</p>
            <h2 id="journey-title">Our Journey</h2>
            <div>
              {content.timeline.map((item, index) => (
                <article key={`${item.year}-${index}`}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" loading="lazy" />
                  )}
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
      </section>
    </PageShell>
  );
}
