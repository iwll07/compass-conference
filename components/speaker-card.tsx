import Image from "next/image";
import type { CSSProperties } from "react";
import type { Speaker } from "@/lib/content";
import { CompassRose } from "@/components/compass-rose";
import { getInitials } from "@/lib/honorees";

export function SpeakerCard({ speaker, index = 0 }: { speaker: Speaker; index?: number }) {
  const initials = getInitials(speaker.name);

  return (
    <article
      id={speaker.id}
      className="speaker-card reveal"
      style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
    >
      <div className="speaker-card-stage">
        <CompassRose className="speaker-card-compass" />
        {speaker.photoUrl ? (
          <Image
            src={speaker.photoUrl}
            alt={speaker.name}
            width={560}
            height={720}
            sizes="(max-width: 899px) 92vw, (max-width: 1199px) 46vw, 31vw"
            loading="lazy"
            className="speaker-card-photo"
          />
        ) : (
          <div className="speaker-card-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
      </div>
      <div className="speaker-card-body">
        <h3 className="speaker-card-name">{speaker.name}</h3>
        {(speaker.role || speaker.affiliation) && (
          <div className="speaker-card-meta">
            {speaker.role && <p className="speaker-card-role">{speaker.role}</p>}
            {speaker.affiliation && <p className="speaker-card-affiliation">{speaker.affiliation}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
