import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import InnerPageHero from "@/components/inner-page-hero";
import { getManufacturingCms } from "@/lib/site-cms";

export const metadata: Metadata = {
  title: "Solar Module Manufacturing",
  description:
    "Explore the Solarious solar module manufacturing process, automation, testing and traceability.",
};

export default async function ManufacturingPage() {
  const content = await getManufacturingCms();
  const icons = [Factory, ScanLine, ShieldCheck];
  const features = content.sections
    .slice(0, 3)
    .map((section, index) => ({ ...section, icon: icons[index] || Factory }));
  return (
    <main className="premium-manufacturing-page">
      <InnerPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.intro}
        image={content.heroImage}
      />
      <section className="manufacturing-editorial premium-section">
        <div className="premium-heading-row">
          <div>
            <p className="premium-kicker">Manufacturing excellence</p>
            <h2>Process discipline from cell inspection to dispatch.</h2>
          </div>
          <p>
            Solarious brings controlled material flow, repeatable assembly and
            structured testing together to support project-ready modules.
          </p>
        </div>
        <div className="manufacturing-editorial-image">
          <Image
            src={content.heroImage}
            alt="Solar module manufacturing equipment"
            fill
            sizes="(max-width: 900px) 100vw, 60vw"
          />
          <span>Solarious / Production &amp; engineering</span>
        </div>
        <div className="manufacturing-editorial-features">
          {features.map(({ title, text, icon: Icon }, index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon size={23} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="manufacturing-process premium-section">
        <div className="premium-heading-row">
          <div>
            <p className="premium-kicker">Manufacturing roadmap</p>
            <h2>Manufacturing Process &amp; Facilities</h2>
          </div>
          <p>
            Explore the processes, infrastructure, quality practices, and
            manufacturing capabilities behind Solarious Energy&apos;s solar
            module solutions. Stage labels remain subject to company
            confirmation in the Admin CMS.
          </p>
        </div>
        <div className="manufacturing-process-grid">
          {content.steps.map((step, index) => (
            <article key={`${step.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <CheckCircle2 size={18} />
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              {step.imageUrl && (
                <Image src={step.imageUrl} alt="" width={480} height={280} />
              )}{" "}
              {step.videoUrl && (
                <a href={step.videoUrl} target="_blank" rel="noreferrer">
                  View stage video
                </a>
              )}
            </article>
          ))}
        </div>
        <div className="premium-wide-cta">
          <div>
            <p className="premium-kicker">Plan with confidence</p>
            <h2>Discuss your module requirements.</h2>
          </div>
          <Link className="premium-button" href="/quote">
            Request a quote <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
