import Link from "next/link";
import { notFound } from "next/navigation";
import InnerPageHero from "@/components/inner-page-hero";
import { PUBLIC_HERO_PRESETS } from "@/lib/public-hero";
import { getEvent, getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  const date = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: event.start_time ? "short" : undefined,
    timeZone: event.timezone || "Asia/Kolkata",
  }).format(new Date(event.event_date));
  const related = (await getEvents())
    .filter((item) => item.id !== event.id)
    .slice(0, 3);

  return (
    <main>
      <InnerPageHero
        {...PUBLIC_HERO_PRESETS.eventDetail}
        eyebrow={event.category}
        title={event.title}
        description={`${date} · ${event.venue}`}
        breadcrumb={[
          { label: "Events", href: "/events" },
          { label: event.title },
        ]}
      />
      <section className="content-section event-detail">
        <img
          className="event-cover"
          src={event.cover_url || "/utility-solar.webp"}
          alt={event.title}
        />
        <div className="event-facts">
          <p><strong>Venue:</strong> {event.venue}</p>
          {event.address && <p>{event.address}</p>}
          {event.maps_url && <a href={event.maps_url} target="_blank" rel="noreferrer">View map</a>}
          {event.registration_url && <a className="button" href={event.registration_url} target="_blank" rel="noreferrer">Registration</a>}
        </div>
        <p className="event-description">{event.description || event.short_description}</p>
        {event.gallery?.length > 0 && (
          <div className="event-gallery">
            {event.gallery.map((image, index) => (
              <a key={image.url} href={image.url} target="_blank" rel="noreferrer">
                <img src={image.url} alt={`${event.title} gallery image ${index + 1}`} />
              </a>
            ))}
          </div>
        )}
        <h2>Related events</h2>
        <div className="related-grid">
          {related.map((item) => (
            <Link key={item.id} href={`/events/${item.slug}`}>
              <span>{item.category}</span>
              <strong>{item.title}</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
