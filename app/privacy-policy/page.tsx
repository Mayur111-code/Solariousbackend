import type { Metadata } from "next";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Solarious Energy website privacy information.",
};

export default function Page() {
  return (
    <main>
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.privacy}
        eyebrow="Legal"
        title="Privacy Policy"
        description="This website may collect information submitted through inquiry and quote forms for responding to business requests. Production data storage, retention, analytics and third-party service details must be reviewed and updated before public launch."
      />
      <section className="legal-page legal-content">
        <h2>Information you provide</h2>
        <p>Contact, company and project information may be used to respond to your inquiry and coordinate technical or commercial follow-up.</p>
        <h2>Your choices</h2>
        <p>You may request correction or deletion using the verified company contact channel once published.</p>
      </section>
    </main>
  );
}
