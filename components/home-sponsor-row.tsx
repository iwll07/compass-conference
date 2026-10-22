"use client";

import { useState } from "react";
import Image from "next/image";
import { type Sponsor, sortSponsors } from "@/lib/sponsors";
import { SponsorDialog } from "@/components/sponsor-dialog";

interface HomeSponsorRowProps {
  sponsors: Sponsor[];
}

export function HomeSponsorRow({ sponsors: rawSponsors }: HomeSponsorRowProps) {
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  const sponsors = sortSponsors(rawSponsors);

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <>
      <div className="sponsor-strip-row" aria-label="Conference sponsors">
        {sponsors.map((sponsor) => {
          const hasDetails = !!sponsor.details;
          const hasHref = !!sponsor.href;
          const isInteractive = hasDetails || hasHref;

          const tileClass = `sponsor-strip-tile sponsor-strip-tile-${sponsor.tier} ${
            isInteractive ? "hover-lift" : ""
          }`;

          const content = (
            <Image
              src={sponsor.logo.src}
              alt={sponsor.logo.alt || sponsor.name}
              width={sponsor.logo.width}
              height={sponsor.logo.height}
              className={`sponsor-strip-logo sponsor-strip-logo-${sponsor.tier}`}
            />
          );

          if (hasDetails) {
            return (
              <button
                key={sponsor.id}
                type="button"
                className={tileClass}
                onClick={() => setSelectedSponsor(sponsor)}
                aria-haspopup="dialog"
                aria-label={`About ${sponsor.name}, ${sponsor.tier} partner`}
              >
                {content}
              </button>
            );
          }

          if (hasHref && sponsor.href) {
            return (
              <a
                key={sponsor.id}
                href={sponsor.href}
                target="_blank"
                rel="noopener noreferrer"
                className={tileClass}
                aria-label={`Visit ${sponsor.name}`}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={sponsor.id} className={tileClass} aria-label={sponsor.name}>
              {content}
            </div>
          );
        })}
      </div>

      <SponsorDialog
        sponsor={selectedSponsor}
        onClose={() => setSelectedSponsor(null)}
      />
    </>
  );
}
