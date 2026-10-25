import type { Metadata } from "next";
import QuoteWizard from "@/components/quote-wizard";
import { getCompanyCms } from "@/lib/site-cms";
import InnerPageHero from "@/components/inner-page-hero";
export const metadata:Metadata={title:"Request a Quote",description:"Submit project and solar module requirements to the Solarious Energy team."};
export default async function Page(){const company=await getCompanyCms();return <main className="quote-page"><InnerPageHero eyebrow="Project inquiry" title="Request a Solar Quote" description="Share your project details through a guided five-step form. Confirmed specifications and pricing are provided by the Solarious team."/><QuoteWizard/><p className="quote-contact-note">For quotation assistance, email <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a>.</p></main>}
