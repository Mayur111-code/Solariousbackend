import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/page-shell";
import type { PublicHeroProps } from "@/components/inner-page-hero";

type SectionPageProps = {
  content: {
    eyebrow: string;
    title: string;
    intro: string;
    sections: readonly (readonly [string, string])[];
  };
  extra?: ReactNode;
} & Omit<Partial<PublicHeroProps>, "eyebrow" | "title" | "description" | "children">;

export default function SectionPage({
  content,
  extra,
  ...hero
}: SectionPageProps) {
  return (
    <PageShell
      eyebrow={content.eyebrow}
      title={content.title}
      intro={content.intro}
      {...hero}
    >
      <section className="content-section">
        <div className="content-grid">
          {content.sections.map(([title, text]) => (
            <article className="content-card" key={title}>
              <CheckCircle2 size={22} />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
        {extra}
        <div className="wide-cta">
          <div>
            <p className="eyebrow">Start a conversation</p>
            <h2>Planning a solar project?</h2>
            <p>
              Share your application, capacity and timeline for confirmed
              technical guidance.
            </p>
          </div>
          <Link className="button" href="/quote">
            Request a quote <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
