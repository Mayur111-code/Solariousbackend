/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Image from "next/image";
import LeadFormModal from "@/components/lead-form-modal";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Factory,
  Gauge,
  Layers,
  Leaf,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";
import AiSolarSection from "@/components/ai-solar-section";
import HeroSlider from "@/components/hero-slider";
import HomeMotion from "@/components/home-motion";
import PremiumProductShowcase from "@/components/premium-product-showcase";
import WhatsAppLink from "@/components/whatsapp-contact";
import { getCompanyCms } from "@/lib/site-cms";
import { getEvents } from "@/lib/events";
import { getGallery } from "@/lib/gallery";
import { getProductionHeroBanners } from "@/lib/hero-banners";
import { getSiteProducts } from "@/lib/site-products";
import { getTeamMembers } from "@/lib/team";
import { getCertifications, getPerformanceMetrics } from "@/lib/certifications";

export const dynamic = "force-dynamic";

const pillars = [
  { number: "01", title: "Premium Quality", text: "Disciplined inspection, dependable materials and traceable quality checks shape every module.", icon: ShieldCheck },
  { number: "02", title: "Advanced Technology", text: "Modern cell architectures support project-specific performance and design priorities.", icon: Sparkles },
  { number: "03", title: "Sustainable Progress", text: "Responsible manufacturing and durable solar solutions support a cleaner energy future.", icon: Leaf },
];

const capabilities = [
  { title: "Solar panel technology", text: "Mono PERC, TOPCon, HJT and Bifacial categories, each explained through approved product information.", icon: Layers },
  { title: "Energy conversion", text: "Cell architecture and module design are matched to the project's performance and space priorities.", icon: Zap },
  { title: "System performance", text: "Preliminary planning tools help teams reason about capacity, module count and available area.", icon: Gauge },
  { title: "Installation quality", text: "Technical guidance supports correct handling, mounting and commissioning decisions.", icon: Wrench },
  { title: "Monitoring & maintenance", text: "Post-installation performance awareness and responsive technical support keep systems accountable.", icon: Activity },
];

const fallbackGallery = [
  { id: "factory", image_url: "/manufacturing-line.webp", alt_text: "Solar module manufacturing line", title: "Manufacturing discipline", category: "Manufacturing" },
  { id: "utility", image_url: "/utility-solar.webp", alt_text: "Utility scale solar project", title: "Utility-scale applications", category: "Projects" },
  { id: "technology", image_url: "/ai-solar-intelligence.webp", alt_text: "Solar technology and digital intelligence", title: "Intelligent solar planning", category: "Technology" },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "S";

export default async function Home() {
  const [banners, products, gallery, events, company, metrics, certifications, team] = await Promise.all([
    getProductionHeroBanners(),
    getSiteProducts(),
    getGallery(),
    getEvents(),
    getCompanyCms(),
    getPerformanceMetrics(),
    getCertifications(),
    getTeamMembers(),
  ]);
  const galleryPreview = gallery.length ? gallery.slice(0, 5) : fallbackGallery;
  const eventPreview = events.slice(0, 3);
  const teamPreview = team.slice(0, 3);

  const publishedMetrics = metrics.metrics.filter((metric) => metric.published !== false);
  const complianceHighlights = certifications.groups.map((group) => ({
    id: group.id,
    label: group.label,
    standards: [...new Set(group.records.flatMap((record) => record.standards))].slice(0, 4),
    verified: group.records.every((record) => record.verified) && group.records.length > 0,
  }));

  return <HomeMotion>
    <HeroSlider banners={banners} />

    {publishedMetrics.length ? (
      <section className="future-metrics" aria-labelledby="performance-metrics-heading">
        <div className="future-metrics-inner">
          <div className="future-metrics-head" data-reveal>
            <p className="future-kicker">Current module performance</p>
            <h2 id="performance-metrics-heading" className="future-metrics-title">
              {metrics.verified ? <>Measured. <em>Not marketing.</em></> : <>Indicative figures. <em>Verification pending.</em></>}
            </h2>
          </div>
          {metrics.verified ? (
            <>
              <dl className="metric-band">
                {publishedMetrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                    <small>{metric.description}</small>
                  </div>
                ))}
              </dl>
              <p className="metric-band-note">
                Figures verified against current approved module datasheets. {metrics.note}
              </p>
            </>
          ) : (
            <div className="future-metrics-pending">
              <ShieldAlert size={22} aria-hidden="true" />
              <div>
                <strong>Performance figures are awaiting verification.</strong>
                <p>{metrics.note || "Module values are published only after they are checked against an approved datasheet."}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    ) : null}

    <section className="future-split" aria-labelledby="future-challenge-heading">
      <div className="future-split-grid" data-split>
        <article className="future-split-panel future-challenge">
          <p className="future-kicker">The challenge</p>
          <h2 id="future-challenge-heading">Energy Shouldn&apos;t Be <em>Complicated.</em></h2>
          <p>Rising electricity costs, increasing energy demands, and environmental challenges make traditional energy solutions less sustainable.</p>
          <span className="future-split-index" aria-hidden="true">01 / Challenge</span>
        </article>
        <div className="future-split-connector" aria-hidden="true"><i /></div>
        <article className="future-split-panel future-solution">
          <p className="future-kicker">Our solution</p>
          <h2>Beyond Solar. <em>Beyond Expectations.</em></h2>
          <p>Solarious Energy brings together modern solar technology, thoughtful system design, and professional installation to make clean energy more accessible.</p>
          <span className="future-split-index" aria-hidden="true">02 / Solution</span>
        </article>
      </div>
    </section>

    <section className="premium-products future-products" aria-labelledby="technology-experience-heading">
      <div className="future-section-head" data-reveal>
        <div>
          <p className="future-kicker">Solar technology experience</p>
          <h2 id="technology-experience-heading">Engineered to <em>Capture More.</em></h2>
        </div>
        <div className="future-section-aside">
          <p>Advanced solar technology designed to deliver reliable performance, efficient energy generation, and long-term value.</p>
          <Link className="premium-text-link" href="/about#company-documents">Relevant documents <ArrowRight size={16} /></Link>
        </div>
      </div>
      <PremiumProductShowcase products={products} />
    </section>

    <section className="premium-manufacturing future-manufacturing" aria-labelledby="manufacturing-showcase">
      <div className="premium-manufacturing-image" data-parallax><Image src="/manufacturing-line.webp" alt="Solarious solar module manufacturing line" fill sizes="(max-width: 1050px) 100vw, 36vw" /></div>
      <div className="premium-manufacturing-copy" data-reveal>
        <p className="future-kicker">Advanced manufacturing</p>
        <h2 id="manufacturing-showcase">Precision Manufacturing.<br /><em>Powering Tomorrow.</em></h2>
        <p>A disciplined production line built around process control, automation, testing and traceability.</p>
        <div className="manufacturing-features">
          <span><Factory size={19} /><strong>Controlled production</strong><small>Structured material flow and repeatable assembly.</small></span>
          <span><ShieldCheck size={19} /><strong>Quality checkpoints</strong><small>Inspection, EL imaging and flash testing.</small></span>
        </div>
        <Link className="premium-button light" href="/quality">Explore quality systems <ArrowUpRight size={16} /></Link>
      </div>
    </section>

    <section className="future-tech" aria-labelledby="future-tech-heading">
      <div className="future-tech-head" data-reveal>
        <div>
          <p className="future-kicker">Technology &amp; performance</p>
          <h2 id="future-tech-heading">Intelligence Behind <em>Every Ray.</em></h2>
        </div>
        <p>Combining modern solar technology with intelligent system design to deliver dependable and efficient energy solutions.</p>
      </div>
      <div className="future-capability-grid" data-reveal-group>
        {capabilities.map(({ title, text, icon: Icon }, index) => (
          <article key={title} data-reveal-item>
            <span className="future-capability-index">{String(index + 1).padStart(2, "0")}</span>
            <Icon size={24} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <p className="future-note" data-reveal>Specifications, certifications and performance values are published only after verification. Confirm project-specific figures with the Solarious technical team and the approved datasheet issued with your quotation.</p>
    </section>

    <AiSolarSection />

    <section className="future-story" aria-labelledby="future-story-heading">
      <div className="future-story-media">
        <Image src="/hero-solar-4.webp" alt="Utility-scale solar installation stretching toward the horizon at sunrise" fill sizes="100vw" />
      </div>
      <div className="future-story-shade" aria-hidden="true" />
      <div className="future-story-copy">
        <p className="future-kicker">Cinematic perspective</p>
        <h2 id="future-story-heading">The Future Runs on <em>Clean Energy.</em></h2>
        <p>Every solar installation represents a step towards a more sustainable tomorrow. Together, we can make clean energy part of everyday life.</p>
        <Link className="future-story-link" href="/about">Our story <ArrowRight size={16} /></Link>
      </div>
    </section>

    <section className="future-why premium-section" aria-labelledby="why-solarious">
      <div className="future-section-head" data-reveal>
        <div>
          <p className="future-kicker">Why Solarious</p>
          <h2 id="why-solarious">Confidence at every <em>project stage.</em></h2>
        </div>
        <p>Purposeful technology, disciplined quality and responsible thinking—brought together for demanding solar projects.</p>
      </div>
      <div className="future-pillar-grid" data-reveal-group>
        {pillars.map(({ number, title, text, icon: Icon }) => (
          <article key={number} data-reveal-item>
            <span>{number}</span>
            <Icon size={22} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="future-company" aria-labelledby="future-company-heading">
      <div className="future-company-copy" data-reveal>
        <p className="future-kicker">{company.companyName}</p>
        <h2 id="future-company-heading">Driven by Purpose. <em>Powered by Innovation.</em></h2>
        <p>{company.description}</p>
        <p>At Solarious Energy, our focus is on delivering thoughtful solar solutions through technology, expertise, and a commitment to a sustainable future.</p>
        <dl className="future-company-facts">
          <div><dt>Legal name</dt><dd>{company.legalName}</dd></div>
          <div><dt>Registered office</dt><dd>{company.registeredOffice}</dd></div>
          <div><dt>Manufacturing</dt><dd>{company.factoryAddress}</dd></div>
        </dl>
        <Link className="future-text-link" href="/about">Meet Solarious <ArrowRight size={16} /></Link>
      </div>
      <div className="future-company-side">
        {teamPreview.length ? (
          <div className="future-team" data-reveal-group>
            <p className="future-kicker">People behind the work</p>
            {teamPreview.map((member) => (
              <article key={member.id} data-reveal-item>
                {member.photo_url ? <img src={member.photo_url} alt={`${member.name}, ${member.designation}`} loading="lazy" decoding="async" /> : <span className="future-team-initials" aria-hidden="true">{initials(member.name)}</span>}
                <div><strong>{member.name}</strong><small>{member.designation}</small></div>
              </article>
            ))}
            <Link className="future-text-link" href="/about">View the team <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <div className="future-purpose" data-reveal>
            <Sun size={30} aria-hidden="true" />
            <strong>Technology with a clear purpose.</strong>
            <p>Every Solarious module is backed by manufacturing discipline, documented quality checks and responsive technical support.</p>
          </div>
        )}
      </div>
    </section>

    <section className="future-impact" aria-labelledby="future-impact-heading">
      <div className="future-impact-copy" data-reveal>
        <p className="future-kicker">Rooted in India</p>
        <h2 id="future-impact-heading">Building a Brighter <em>Energy Future.</em></h2>
        <p>Expanding access to smarter solar energy solutions and contributing to a cleaner, more sustainable world.</p>
        <div className="future-impact-address"><MapPin size={18} aria-hidden="true" /><span>{company.factoryAddress}</span></div>
        <Link className="future-text-link" href="/contact">Visit the contact page <ArrowRight size={16} /></Link>
      </div>
      <div className="future-impact-panel" data-reveal>
        <span className="future-impact-mark" aria-hidden="true"><Sun size={34} /></span>
        <p className="future-kicker">Applications</p>
        <ul>
          <li>Commercial rooftop</li>
          <li>Industrial facilities</li>
          <li>Utility-scale projects</li>
          <li>Distributed generation</li>
        </ul>
        <small>Application categories published by Solarious. Site-specific engineering is confirmed per project.</small>
      </div>
    </section>

    <section className="premium-gallery future-gallery" aria-labelledby="gallery-preview-heading">
      <div className="future-section-head" data-reveal>
        <div>
          <p className="future-kicker">In the field</p>
          <h2 id="gallery-preview-heading">Applications in <em>focus.</em></h2>
        </div>
        <Link className="premium-text-link" href="/gallery">View the full gallery <ArrowRight size={16} /></Link>
      </div>
      <div className={`premium-gallery-grid count-${Math.min(galleryPreview.length, 5)}`} data-reveal-group>
        {galleryPreview.map((image, index) => (
          <Link href="/gallery" className={`premium-gallery-card item-${index + 1}`} key={image.id} data-reveal-item>
            <Image src={image.image_url} alt={image.alt_text || image.title || "Solarious gallery"} fill sizes="(max-width: 700px) 84vw, 40vw" />
            <span><small>{image.category}</small><strong>{image.title || "Solarious Energy"}</strong></span>
          </Link>
        ))}
      </div>
      <p className="future-note">Gallery imagery is managed by the Solarious team. Project-specific records and references are shared on request.</p>
    </section>

    {complianceHighlights.length ? (
      <section className="future-compliance" aria-labelledby="compliance-ribbon-heading">
        <div className="future-section-head" data-reveal>
          <div>
            <p className="future-kicker">Bankability &amp; compliance</p>
            <h2 id="compliance-ribbon-heading">Documented, <em>not assumed.</em></h2>
          </div>
          <Link className="premium-text-link" href="/certifications">Certification registry <ArrowRight size={16} /></Link>
        </div>
        <div className="compliance-ribbon-grid" data-reveal-group>
          {complianceHighlights.map((item) => (
            <Link href="/certifications" key={item.id} className="compliance-ribbon-item" data-reveal-item>
              <span className={`verification-chip ${item.verified ? "verified" : "pending"}`}>
                {item.verified ? <BadgeCheck size={14} /> : <ShieldAlert size={14} />}
                {item.verified ? "Verified" : "Documentation pending"}
              </span>
              <strong>{item.label}</strong>
              <small>{item.standards.join(" · ") || "Standards published after verification"}</small>
            </Link>
          ))}
        </div>
        <p className="future-note">A certification is shown as verified only after the certificate document is uploaded and approved. Request the current compliance pack with any quotation.</p>
      </section>
    ) : null}

    <section className="premium-events future-events" aria-labelledby="events-heading">
      <div className="future-section-head" data-reveal>
        <div>
          <p className="future-kicker">Events &amp; activities</p>
          <h2 id="events-heading">Meet. Learn. <em>Move solar forward.</em></h2>
        </div>
        <Link className="premium-text-link" href="/events">All events <ArrowRight size={16} /></Link>
      </div>
      {eventPreview.length ? <div className="premium-event-track" data-reveal-group>{eventPreview.map((event) => <article key={event.id} data-reveal-item><Image src={event.cover_url || "/utility-solar.webp"} alt="" width={900} height={560} sizes="(max-width: 700px) 84vw, 33vw" /><div><span><CalendarDays size={14} /> {formatDate(event.event_date)}</span><h3>{event.title}</h3><p>{event.short_description}</p><Link href={`/events/${event.slug}`}>View event <ArrowUpRight size={15} /></Link></div></article>)}</div> : <div className="premium-empty-state"><CalendarDays size={28} /><h3>New events are on the way.</h3><p>Published exhibitions, technical sessions and activities will appear here.</p><Link href="/events">Explore events</Link></div>}
    </section>

    <section className="premium-contact-cta future-cta" aria-labelledby="contact-cta-heading">
      <div>
        <p className="future-kicker">Start your solar project</p>
        <h2 id="contact-cta-heading">Your Future Starts <em>With Solar.</em></h2>
        <p>Take the next step towards smarter energy. Connect with our team to discover the right solar solution for your needs.</p>
      </div>
      <div className="premium-cta-actions">
        <div className="premium-cta-buttons">
          <LeadFormModal label="Get a Free Consultation" className="premium-button" />
          <Link className="premium-button secondary" href="/products">Explore Solar Solutions <ArrowRight size={16} /></Link>
        </div>
        <div className="premium-cta-links">
          <Link href="/quote">Full quote form</Link>
          <Link href="/contact">Contact our team</Link>
          <WhatsAppLink className="premium-whatsapp-link">Chat on WhatsApp</WhatsAppLink>
        </div>
      </div>
    </section>
  </HomeMotion>;
}
