import type { Metadata } from "next";
import RfqWizard from "@/components/rfq-wizard";
import WhatsAppLink from "@/components/whatsapp-contact";
import { getCompanyCms } from "@/lib/site-cms";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";

export const metadata: Metadata = {
  title: "Request a Commercial Quote (RFQ)",
  description: "Submit a structured B2B procurement inquiry for Solarious Energy solar modules and receive a tracked RFQ reference number.",
  alternates: { canonical: "/quote" },
};

export default async function Page() {
  const company = await getCompanyCms();
  return (
    <main className="quote-page">
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.quote}
        eyebrow="Commercial procurement"
        title="Request a Commercial Quote"
        description="Submit a structured RFQ for module supply. Every submission is logged with a reference number and routed to the right sales desk — utility-scale requests of 1 MW and above are escalated immediately."
      />
      <RfqWizard />
      <p className="quote-contact-note">
        For quotation assistance, email{" "}
        <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a> or{" "}
        <WhatsAppLink className="quote-whatsapp-link">message us on WhatsApp</WhatsAppLink>.
      </p>
    </main>
  );
}
