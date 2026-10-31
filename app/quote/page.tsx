import type { Metadata } from "next";
import QuoteExperience from "@/components/quote-experience";
import WhatsAppLink from "@/components/whatsapp-contact";
import { getCompanyCms } from "@/lib/site-cms";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = {
  title: "Request a Solar Quote",
  description: "Request a project-specific Solarious solar quote for residential, commercial, industrial or utility-scale requirements — or submit a structured commercial RFQ.",
  alternates: { canonical: "/quote" },
};

export default async function Page() {
  const company = await getCompanyCms();
  return (
    <main className="quote-page">
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.quote}
        eyebrow="Quotations"
        title="Request a Solar Quote"
        description="Share your project details once and our team will respond with a project-specific quotation. Commercial and utility-scale buyers can submit a structured RFQ with a tracked reference number."
      />
      <QuoteExperience />
      <p className="quote-contact-note">
        For quotation assistance, email{" "}
        <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a> or{" "}
        <WhatsAppLink className="quote-whatsapp-link">message us on WhatsApp</WhatsAppLink>.
      </p>
    </main>
  );
}
