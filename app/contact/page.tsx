import type { Metadata } from "next";
import ContactForm from "@/components/contact-form";
import LocationMap from "@/components/location-map";
import PageShell from "@/components/page-shell";
import { getCompanyCms, getLocations } from "@/lib/site-cms";
export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Solarious Energy for module specifications, quotations and project support.",
};
export default async function Page() {
  const [locations, company] = await Promise.all([getLocations(), getCompanyCms()]);
  return (
    <PageShell
      eyebrow="Get in touch"
      title="Let’s Work Together"
      intro="Tell us about your application, capacity and timeline. The right Solarious team member can respond with confirmed information."
      image="/ai-solar-intelligence.webp"
    >
      <section className="content-section">
        <div className="contact-layout">
          <div>
            <p className="eyebrow">Request information</p>
            <h2>Start your inquiry</h2>
            <ContactForm />
            <p className="contact-email-note">
              Prefer email?{" "}
              <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a>
            </p>
          </div>
          <aside>
            <h2>Company details</h2>
            <dl>
              <div>
                <dt>Company</dt>
                <dd>{company.legalName}</dd>
              </div>
              <div>
                <dt>Head Office</dt>
                <dd>{company.registeredOffice}</dd>
              </div>
              <div>
                <dt>Manufacturing Unit</dt>
                <dd>{company.factoryAddress}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${company.generalEmail}`}>{company.generalEmail}</a>
                </dd>
              </div>
              {company.salesEmail && <div><dt>Sales</dt><dd><a href={`mailto:${company.salesEmail}`}>{company.salesEmail}</a></dd></div>}
              {company.purchaseEmail && <div><dt>Purchase</dt><dd><a href={`mailto:${company.purchaseEmail}`}>{company.purchaseEmail}</a></dd></div>}
              {company.qcEmail && <div><dt>Quality</dt><dd><a href={`mailto:${company.qcEmail}`}>{company.qcEmail}</a></dd></div>}
              {company.factoryEmail && <div><dt>Factory</dt><dd><a href={`mailto:${company.factoryEmail}`}>{company.factoryEmail}</a></dd></div>}
              <div>
                <dt>Website</dt>
                <dd>
                  <a href={company.websiteUrl} target="_blank" rel="noreferrer">
                    {company.website}
                  </a>
                </dd>
              </div>
            </dl>
            <div className="contact-actions">
              <a className="button" href={`mailto:${company.generalEmail}`}>
                Email Solarious
              </a>
            </div>
            {company.primaryPhone && <p>Primary contact: <a href={`tel:${company.primaryPhone}`}>{company.primaryPhone}</a>{company.secondaryPhone ? <> · <a href={`tel:${company.secondaryPhone}`}>{company.secondaryPhone}</a></> : null}</p>}
            {company.officeContact && <p>{company.officeContact}</p>}
          </aside>
        </div>
        {locations.map((location) => (
          <LocationMap
            key={location.id || `${location.latitude}-${location.longitude}`}
            location={location}
          />
        ))}
      </section>
    </PageShell>
  );
}
