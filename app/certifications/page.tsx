import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  FlaskConical,
  Gauge,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getCertifications } from "@/lib/certifications";
import { getCompanyDocuments } from "@/lib/resources";
import { pageContent } from "@/data/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certifications & Bankability",
  description:
    "Solarious Energy compliance framework: BIS registration, ALMM enlistment, IEC test standards and ISO management systems, with verification status for every claim.",
  alternates: { canonical: "/certifications" },
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "";

const fileTypeLabel = (type: string) => {
  if (type === "application/pdf") return "PDF";
  if (type.startsWith("image/")) return type.split("/")[1]?.toUpperCase() || "Image";
  const extension = type.split("/").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "File";
};

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function Page() {
  const [registry, documents] = await Promise.all([getCertifications(), getCompanyDocuments()]);
  const verifiedCount = registry.stats.verified;
  const totalRecords = registry.groups.reduce((sum, group) => sum + group.records.length, 0);
  const certificateDocuments = documents.filter(
    (item) =>
      item.category.toLowerCase().includes("certif") ||
      item.category.toLowerCase().includes("complian") ||
      (item.file_type || "").toLowerCase() === "application/pdf",
  );

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
            {verifiedCount
              ? `${verifiedCount} verified record${verifiedCount === 1 ? "" : "s"} on file`
              : "Documentation in progress"}
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
          <div>
            <dt>Records published</dt>
            <dd>{totalRecords}</dd>
          </div>
        </dl>
      </section>

      <section className="content-section" aria-labelledby="compliance-categories-heading">
        <div className="compliance-section-heading">
          <div>
            <p className="premium-kicker">Certification overview</p>
            <h2 id="compliance-categories-heading">Standards, issuers and status</h2>
          </div>
          <p>
            Grouped by framework. A record becomes “Verified” only when its certificate number and
            document are both on file.
          </p>
        </div>

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
                      {record.logoUrl ? (
                        <span className="certification-mark">
                          {/* Issuer mark uploaded by the compliance team. */}
                          <Image src={record.logoUrl} alt="" width={120} height={48} sizes="120px" />
                        </span>
                      ) : null}
                      <span className={`verification-chip ${record.verified ? "verified" : "pending"}`}>
                        {record.verified ? <BadgeCheck size={15} /> : <ShieldAlert size={15} />}
                        {record.verified
                          ? "Verified"
                          : record.verificationStatus === "pending"
                            ? "Pending review"
                            : "Documentation pending"}
                      </span>
                      {record.expired ? <span className="verification-chip expired">Expired</span> : null}
                    </div>
                    <h4>{record.name}</h4>
                    {record.issuingAuthority ? (
                      <p className="certification-issuer">Issued by {record.issuingAuthority}</p>
                    ) : null}
                    {record.description ? <p>{record.description}</p> : null}
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
                          <dt>{record.expired ? "Expired on" : "Valid until"}</dt>
                          <dd>{formatDate(record.expiresAt)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {record.documentUrl ? (
                      <a
                        className="certification-document"
                        href={record.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={15} /> View certificate document
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

      <section className="content-section compliance-quality" aria-labelledby="compliance-quality-heading">
        <div className="compliance-section-heading">
          <div>
            <p className="premium-kicker">Quality assurance</p>
            <h2 id="compliance-quality-heading">How quality is controlled</h2>
          </div>
          <p>
            Published quality practice for Solarious modules. Process documentation is shared with
            qualified buyers during technical due diligence.
          </p>
        </div>
        <div className="compliance-quality-grid">
          {pageContent.quality.sections.map(([title, text], index) => {
            const icons = [FlaskConical, Gauge, ShieldCheck];
            const Icon = icons[index % icons.length];
            return (
              <article key={title}>
                <Icon size={20} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
        <p className="compliance-note">
          <Link href="/quality">
            Read the full quality systems page <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </p>
      </section>

      <section className="content-section compliance-bankability" aria-labelledby="compliance-bankability-heading">
        <div>
          <p className="premium-kicker">Bankability</p>
          <h2 id="compliance-bankability-heading">Evidence for lender and independent-engineer review</h2>
          <p>
            Bankability is established by the evidence a supplier can produce for a specific project — not
            by a marketing statement. The documents below are the records Solarious can share during
            technical due diligence. <strong>No bank, lender or financial approval is claimed or implied.</strong>
          </p>
          <ul className="bankability-list">
            <li>
              <BadgeCheck size={16} aria-hidden="true" />
              <span>
                <strong>Certification records</strong>
                <small>{verifiedCount} verified, {registry.stats.pending} pending document review</small>
              </span>
            </li>
            <li>
              <FileText size={16} aria-hidden="true" />
              <span>
                <strong>Technical datasheets</strong>
                <small>Model-specific datasheets issued with the quotation</small>
              </span>
            </li>
            <li>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                <strong>Quality assurance records</strong>
                <small>Inspection checkpoints and production traceability</small>
              </span>
            </li>
            <li>
              <CalendarDays size={16} aria-hidden="true" />
              <span>
                <strong>Warranty documentation</strong>
                <small>Current warranty terms supplied with the approved quotation</small>
              </span>
            </li>
          </ul>
          <div className="bankability-actions">
            <Link className="button" href="/quote">
              Request the compliance pack
            </Link>
            <Link className="button button-ghost" href="/contact">
              Talk to the technical team
            </Link>
          </div>
        </div>
        <aside className="bankability-panel">
          <h3>What we publish</h3>
          <p>
            Only documents an administrator has uploaded and approved. Standards without a document
            stay listed as pending, and expired certificates are marked as expired.
          </p>
          <dl>
            <div>
              <dt>Verified records</dt>
              <dd>{registry.stats.verified}</dd>
            </div>
            <div>
              <dt>Awaiting documents</dt>
              <dd>{registry.stats.pending}</dd>
            </div>
            <div>
              <dt>Expired</dt>
              <dd>{registry.stats.expired}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="content-section compliance-documents" aria-labelledby="compliance-documents-heading">
        <div className="compliance-section-heading">
          <div>
            <p className="premium-kicker">Documentation</p>
            <h2 id="compliance-documents-heading">Published company documents</h2>
          </div>
          <p>
            These files open in a secure viewer. For tender submissions, request the complete pack
            from the technical team.
          </p>
        </div>
        {certificateDocuments.length ? (
          <div className="doc-grid">
            {certificateDocuments.slice(0, 8).map((item) => (
              <article className="doc-card" key={item.id}>
                <div className="doc-card-body">
                  <div className="doc-card-labels">
                    <span className="ds-badge" data-tone="neutral">{item.category || "Document"}</span>
                    <span className="doc-product">{fileTypeLabel(item.file_type)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="doc-description">
                    {item.description || "Published Solarious company document."}
                  </p>
                  <dl className="doc-details">
                    {item.issuingOrganization ? (
                      <div><dt>Issued by</dt><dd>{item.issuingOrganization}</dd></div>
                    ) : null}
                    <div><dt>File</dt><dd>{item.file_name} · {megabytes(item.file_size)}</dd></div>
                  </dl>
                </div>
                <div className="doc-card-actions">
                  <a href={`/api/resources/${item.id}/file`} target="_blank" rel="noreferrer">
                    <FileText size={16} aria-hidden="true" /> View document
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="document-empty">
            No public compliance documents have been published yet. Request the compliance pack and the
            technical team will share the applicable records.
          </p>
        )}
      </section>

      <section className="content-section compliance-cta-section" aria-labelledby="compliance-cta-heading">
        <div className="compliance-cta">
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
            <Link className="button button-ghost" href="/about#company-documents">
              Browse documents
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
