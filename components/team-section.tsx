"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  designation: string;
  short_info: string;
  photo_url: string;
  linkedin_url: string;
};

const LinkedInIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.32 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.1 20.45H3.54V9H7.1v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
  </svg>
);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "S";

/** Real portraits where available; a neutral initials disc otherwise. */
function TeamPortrait({ member, priority }: { member: Member; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = member.photo_url?.trim();

  if (!photo || failed) {
    return (
      <div
        className="team-portrait team-portrait-placeholder"
        role="img"
        aria-label={`Portrait placeholder for ${member.name}`}
      >
        <span aria-hidden="true">{initials(member.name)}</span>
      </div>
    );
  }

  return (
    <div className="team-portrait">
      <img
        src={photo}
        alt={`${member.name}, ${member.designation}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function TeamSection({
  initialMembers = [],
}: {
  initialMembers?: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialMembers.length ? "ready" : "loading",
  );
  const hasInitialMembers = initialMembers.length > 0;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/team", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Team request failed (${response.status})`);
        const data = (await response.json()) as { members?: Member[] };
        setMembers(Array.isArray(data.members) ? data.members : []);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to load published team members:", error);
        if (!hasInitialMembers) setStatus("error");
      });
    return () => controller.abort();
  }, [hasInitialMembers]);

  if (status === "error") return null;

  return (
    <section className="team-section" aria-labelledby="team-heading">
      <div className="team-intro">
        <div>
          <p className="eyebrow"><span /> People behind Solarious</p>
          <h2 id="team-heading">Meet <em>Our Team</em></h2>
        </div>
        <p>
          The people guiding Solarious Energy. Leadership and governance
          profiles are presented together using the details published by the
          company.
        </p>
      </div>

      {status === "loading" ? (
        <p className="team-state" role="status" aria-busy="true">
          Loading published team profiles…
        </p>
      ) : members.length ? (
        <div className="team-grid">
          {members.map((member, index) => (
            <article className="team-card ds-interactive" key={member.id}>
              <TeamPortrait member={member} priority={index === 0} />
              <div className="team-card-copy">
                <p className="team-card-role">{member.designation}</p>
                <h3>{member.name}</h3>
                {member.short_info && <p className="team-card-bio">{member.short_info}</p>}
                {member.linkedin_url && (
                  <a
                    className="team-card-linkedin"
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    <LinkedInIcon />
                    <span>LinkedIn profile</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="team-state">Published team profiles will appear here.</p>
      )}
    </section>
  );
}
