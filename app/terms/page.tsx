import type { Metadata } from "next";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms for using the Solarious Energy website and preliminary project tools.",
};

export default function Page() {
  return (
    <main>
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.terms}
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Website content and interactive tools are provided for preliminary information. Product specifications, availability, warranties, engineering results and commercial terms require written confirmation from Solarious Energy."
      />
      <section className="legal-page legal-content">
        <h2>Project tools</h2>
        <p>Calculator, recommendation and comparison outputs are guidance only and must not replace site assessment or professional engineering.</p>
        <h2>Documents and claims</h2>
        <p>Only current, approved company documents should be relied upon for contractual or technical decisions.</p>
      </section>
    </main>
  );
}
