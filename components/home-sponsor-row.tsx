"use client";

import { useState } from "react";
import Image from "next/image";
import { type Sponsor } from "@/lib/sponsors";
import { SponsorDialog } from "@/components/sponsor-dialog";

interface HomeSponsorRowProps {
  sponsors: Sponsor[];
}

export function HomeSponsorRow({ sponsors }: HomeSponsorRowProps) {
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <>
      <div className="sponsor-strip-row" aria-label="Conference sponsors">
        {sponsors.map((sponsor) => {
          // A tile opens the dialog when there is something to say: the full
          // description, or just the links (the syndicate has no description).
          const hasDialog = !!sponsor.details || (sponsor.links?.length ?? 0) > 0;
          const hasHref = !!sponsor.href;
          const isInteractive = hasDialog || hasHref;

          const tileClass = `sponsor-strip-tile ${isInteractive ? "hover-lift" : ""}`;

          const content = (
            <Image
              src={sponsor.logo.src}
              alt={sponsor.logo.alt || sponsor.name}
              width={sponsor.logo.width}
              height={sponsor.logo.height}
              className="sponsor-strip-logo"
            />
          );

          if (hasDialog) {
            return (
              <button
                key={sponsor.id}
                type="button"
                className={tileClass}
                onClick={() => setSelectedSponsor(sponsor)}
                aria-haspopup="dialog"
                aria-label={`About ${sponsor.name}`}
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
