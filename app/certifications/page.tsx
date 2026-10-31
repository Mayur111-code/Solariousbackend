import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, FileText, ShieldAlert } from "lucide-react";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getCertifications } from "@/lib/certifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certifications & Bankability",
  description:
    "Solarious Energy compliance framework: BIS registration, ALMM enlistment, IEC test standards and ISO management systems, with verification status for every claim.",
  alternates: { canonical: "/certifications" },
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "";

export default async function Page() {
  const registry = await getCertifications();
  const verifiedCount = registry.stats.verified;

  return (
    <main className="certifications-page">
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.quality}
        eyebrow="Bankability & compliance"
        title="Certifications & Approvals"
        description="Every claim on this page is tied to a supporting document. Records appear as verified only after the certificate is uploaded and approved by the Solarious compliance team."
      />

      <section className="content-section compliance-summary" aria-labelledby="compliance-summary-heading">
        <div>
          <p className="premium-kicker">Verification policy</p>
          <h2 id="compliance-summary-heading">
            {verifiedCount ? `${verifiedCount} verified record${verifiedCount === 1 ? "" : "s"} on file` : "Documentation in progress"}
          </h2>
          <p>
            Solarious Energy publishes a certification as verified only when the certificate document has been
            received and uploaded. Standards listed without a document are shown as pending — never as obtained.
            Request the current compliance pack with your quotation and it will be shared from the source documents.
          </p>
        </div>
        <dl>
          <div>
            <dt>Verified</dt>
            <dd>{registry.stats.verified}</dd>
          </div>
          <div>
            <dt>Pending review</dt>
            <dd>{registry.stats.pending}</dd>
          </div>
          <div>
            <dt>Expired</dt>
            <dd>{registry.stats.expired}</dd>
          </div>
        </dl>
      </section>

      <section className="content-section" aria-labelledby="compliance-categories-heading">
        <h2 id="compliance-categories-heading" className="visually-hidden">
          Compliance categories
        </h2>
        <div className="certification-groups">
          {registry.groups.map((group) => (
            <article className="certification-group" key={group.id}>
              <header>
                <h3>{group.label}</h3>
                <p>{group.description}</p>
              </header>
              <div className="certification-records">
                {group.records.map((record) => (
                  <div className="certification-card" key={record.id}>
                    <div className="certification-card-head">
                      <span className={`verification-chip ${record.verified ? "verified" : "pending"}`}>
                        {record.verified ? <BadgeCheck size={15} /> : <ShieldAlert size={15} />}
                        {record.verified ? "Verified" : record.verificationStatus === "pending" ? "Pending review" : "Documentation pending"}
                      </span>
                      {record.expired ? <span className="verification-chip expired">Expired</span> : null}
                    </div>
                    <h4>{record.name}</h4>
                    {record.standards.length ? (
                      <ul className="standard-list">
                        {record.standards.map((standard) => (
                          <li key={standard}>{standard}</li>
                        ))}
                      </ul>
                    ) : null}
                    {record.scope ? <p>{record.scope}</p> : null}
                    {record.auditRelevance ? (
                      <p className="audit-relevance">
                        <strong>Audit relevance:</strong> {record.auditRelevance}
                      </p>
                    ) : null}
                    <dl className="certification-meta">
                      {record.verified && record.certificateNumber ? (
                        <div>
                          <dt>Certificate</dt>
                          <dd>{record.certificateNumber}</dd>
                        </div>
                      ) : null}
                      {record.issuedAt ? (
                        <div>
                          <dt>Issued</dt>
                          <dd>{formatDate(record.issuedAt)}</dd>
                        </div>
                      ) : null}
                      {record.expiresAt ? (
                        <div>
                          <dt>Valid until</dt>
                          <dd>{formatDate(record.expiresAt)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {record.documentUrl ? (
                      <a className="certification-document" href={record.documentUrl} target="_blank" rel="noreferrer">
                        <Download size={15} /> View certificate document
                      </a>
                    ) : (
                      <p className="certification-pending">
                        <FileText size={15} /> Certificate document available on request.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section compliance-cta" aria-labelledby="compliance-cta-heading">
        <div>
          <h2 id="compliance-cta-heading">Need the compliance pack for a tender?</h2>
          <p>
            Share your project reference and we will supply the current test reports, certificates and declaration of
            conformity applicable to the module model you are specifying.
          </p>
        </div>
        <div className="compliance-cta-actions">
          <Link className="button" href="/quote">
            Request compliance pack
          </Link>
          <Link className="button button-ghost" href="/resources">
            Browse documents
          </Link>
        </div>
      </section>
    </main>
  );
}
