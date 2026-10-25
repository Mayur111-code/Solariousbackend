import Link from "next/link";
import LeadFormModal from "@/components/lead-form-modal";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, CalendarDays, Factory, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import AiSolarSection from "@/components/ai-solar-section";
import HeroSlider from "@/components/hero-slider";
import PremiumProductShowcase from "@/components/premium-product-showcase";
import TechnologyTabs from "@/components/technology-tabs";
import { getCompanyCms } from "@/lib/site-cms";
import { getEvents } from "@/lib/events";
import { getGallery } from "@/lib/gallery";
import { getProductionHeroBanners } from "@/lib/hero-banners";
import { getSiteProducts } from "@/lib/site-products";

export const dynamic = "force-dynamic";

const pillars = [
  { number: "01", title: "Premium Quality", text: "Disciplined inspection, dependable materials and traceable quality checks shape every module.", icon: ShieldCheck },
  { number: "02", title: "Advanced Technology", text: "Modern cell architectures support project-specific performance and design priorities.", icon: Sparkles },
  { number: "03", title: "Sustainable Progress", text: "Responsible manufacturing and durable solar solutions support a cleaner energy future.", icon: Leaf },
];

const fallbackGallery = [
  { id: "factory", image_url: "/manufacturing-line.webp", alt_text: "Solar module manufacturing line", title: "Manufacturing discipline", category: "Manufacturing" },
  { id: "utility", image_url: "/utility-solar.webp", alt_text: "Utility scale solar project", title: "Utility-scale applications", category: "Projects" },
  { id: "technology", image_url: "/ai-solar-intelligence.webp", alt_text: "Solar technology and digital intelligence", title: "Intelligent solar planning", category: "Technology" },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));

export default async function Home() {
  const [banners, products, gallery, events, company] = await Promise.all([getProductionHeroBanners(), getSiteProducts(), getGallery(), getEvents(), getCompanyCms()]);
  const galleryPreview = gallery.length ? gallery.slice(0, 5) : fallbackGallery;
  const eventPreview = events.slice(0, 3);

  return <main className="premium-home">
    <HeroSlider banners={banners} />

    <section className="premium-intro premium-section" aria-labelledby="brand-introduction">
      <div className="premium-section-number">01</div>
      <div><p className="premium-kicker">{company.companyName}</p><h2 id="brand-introduction">Engineering sunlight into <em>lasting value.</em></h2></div>
      <div className="premium-intro-copy"><p>{company.description}</p><p>We bring product technology, manufacturing discipline and responsive technical support together for commercial, industrial and utility-scale solar applications.</p><Link className="premium-text-link" href="/about">Discover Solarious <ArrowRight size={16} /></Link></div>
    </section>

    <section className="premium-products premium-section" aria-labelledby="product-portfolio">
      <div className="premium-heading-row"><div><p className="premium-kicker">Module portfolio</p><h2 id="product-portfolio">Technology for every <em>solar ambition.</em></h2></div><p>Explore Solarious module categories using approved product information. Confirm final power, efficiency and warranty values with our technical team.</p></div>
      <PremiumProductShowcase products={products} />
    </section>

    <section className="premium-manufacturing" aria-labelledby="manufacturing-showcase">
      <div className="premium-manufacturing-image"><Image src="/manufacturing-line.webp" alt="Solarious solar module manufacturing line" fill sizes="(max-width: 1050px) 100vw, 36vw" /></div>
      <div className="premium-manufacturing-copy"><p className="premium-kicker">Advanced manufacturing</p><h2 id="manufacturing-showcase">Precision Manufacturing.<br /><em>Powering Tomorrow.</em></h2><p>A disciplined production line built around process control, automation, testing and traceability.</p><div className="manufacturing-features"><span><Factory size={19} /><strong>Controlled production</strong><small>Structured material flow and repeatable assembly.</small></span><span><ShieldCheck size={19} /><strong>Quality checkpoints</strong><small>Inspection, EL imaging and flash testing.</small></span></div><Link className="premium-button light" href="/manufacturing">Explore manufacturing <ArrowUpRight size={16} /></Link></div>
    </section>

    <section className="premium-technology premium-section" aria-labelledby="technology-experience-heading">
      <div className="premium-heading-row"><div><p className="premium-kicker">Solar technology experience</p><h2 id="technology-experience-heading">Purpose-built technologies.<br /><em>Clearly explained.</em></h2></div><Link className="premium-text-link" href="/products">Explore products <ArrowRight size={16} /></Link></div>
      <TechnologyTabs products={products} compact />
    </section>

    <section className="premium-why premium-section" aria-labelledby="why-solarious">
      <div className="premium-heading-row"><div><p className="premium-kicker">Why Solarious</p><h2 id="why-solarious">Confidence at every <em>project stage.</em></h2></div><p>Purposeful technology, disciplined quality and responsible thinking—brought together for demanding solar projects.</p></div>
      <div className="premium-pillar-grid">{pillars.map(({ number, title, text, icon: Icon }) => <article key={number}><span>{number}</span><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <AiSolarSection />

    <section className="premium-gallery premium-section" aria-labelledby="gallery-preview-heading">
      <div className="premium-heading-row"><div><p className="premium-kicker">Projects &amp; gallery</p><h2 id="gallery-preview-heading">Solarious in <em>focus.</em></h2></div><Link className="premium-text-link" href="/gallery">View full gallery <ArrowRight size={16} /></Link></div>
      <div className={`premium-gallery-grid count-${Math.min(galleryPreview.length, 5)}`}>{galleryPreview.map((image, index) => <Link href="/gallery" className={`premium-gallery-card item-${index + 1}`} key={image.id}><Image src={image.image_url} alt={image.alt_text || image.title || "Solarious gallery"} fill sizes="(max-width: 700px) 84vw, 40vw" /><span><small>{image.category}</small><strong>{image.title || "Solarious Energy"}</strong></span></Link>)}</div>
    </section>

    <section className="premium-events premium-section" aria-labelledby="events-heading">
      <div className="premium-heading-row"><div><p className="premium-kicker">Events &amp; activities</p><h2 id="events-heading">Meet. Learn. <em>Move solar forward.</em></h2></div><Link className="premium-text-link" href="/events">All events <ArrowRight size={16} /></Link></div>
      {eventPreview.length ? <div className="premium-event-track">{eventPreview.map((event) => <article key={event.id}><Image src={event.cover_url || "/utility-solar.webp"} alt="" width={900} height={560} sizes="(max-width: 700px) 84vw, 33vw" /><div><span><CalendarDays size={14} /> {formatDate(event.event_date)}</span><h3>{event.title}</h3><p>{event.short_description}</p><Link href={`/events/${event.slug}`}>View event <ArrowUpRight size={15} /></Link></div></article>)}</div> : <div className="premium-empty-state"><CalendarDays size={28} /><h3>New events are on the way.</h3><p>Published exhibitions, technical sessions and activities will appear here.</p><Link href="/events">Explore events</Link></div>}
    </section>

    <section className="premium-contact-cta" aria-labelledby="contact-cta-heading">
      <div><p className="premium-kicker">Start your solar project</p><h2 id="contact-cta-heading">Let&apos;s build a cleaner energy future.</h2><p>Share your application, capacity and timeline for project-focused guidance from the Solarious team.</p></div>
      <div><LeadFormModal label="Get a quote" className="premium-button"/><Link className="premium-button secondary" href="/contact">Contact our team</Link></div>
    </section>
  </main>;
}
