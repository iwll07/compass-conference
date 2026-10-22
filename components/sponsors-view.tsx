"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FacebookLogo,
  InstagramLogo,
  WhatsappLogo,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import {
  type Sponsor,
  type SponsorTier,
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
  sortSponsors,
} from "@/lib/sponsors";
import { SponsorDialog } from "@/components/sponsor-dialog";

interface SponsorsViewProps {
  sponsors: Sponsor[];
}

export function SponsorsView({ sponsors: rawSponsors }: SponsorsViewProps) {
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  const sponsors = sortSponsors(rawSponsors);

  if (sponsors.length === 0) {
    return (
      <section className="empty-state reveal" aria-labelledby="sponsors-coming-soon">
        <h2 id="sponsors-coming-soon">Our supporters, soon.</h2>
        <p>
          Confirmed sponsors and partners will be listed here with their details. Partnership information is coming soon.
        </p>
      </section>
    );
  }

  // Only render tiers that actually have sponsors
  const activeTiers = SPONSOR_TIERS.filter((tier) =>
    sponsors.some((s) => s.tier === tier)
  );

  return (
    <>
      <div className="sponsors-page-body">
        {activeTiers.map((tier) => {
          const tierSponsors = sponsors.filter((s) => s.tier === tier);
          return (
            <section
              key={tier}
              className="sponsor-tier-section reveal"
              aria-labelledby={`tier-heading-${tier}`}
            >
              <h2 id={`tier-heading-${tier}`} className="announcement-meta sponsor-tier-label">
                {SPONSOR_TIER_LABELS[tier]}
              </h2>

              {tier === "diamond" ? (
                <div className="sponsor-diamond-stack">
                  {tierSponsors.map((sponsor) => (
                    <article key={sponsor.id} className="sponsor-diamond-panel">
                      <div className="sponsor-diamond-left">
                        <Image
                          src={sponsor.logo.src}
                          alt={sponsor.logo.alt}
                          width={sponsor.logo.width}
                          height={sponsor.logo.height}
                          className="sponsor-diamond-logo"
                        />
                        <div className="sponsor-diamond-info">
                          <h3 className="sponsor-diamond-name">{sponsor.name}</h3>
                          <p className="sponsor-diamond-tagline">{sponsor.tagline}</p>
                        </div>
                      </div>

                      <div className="sponsor-diamond-right">
                        {sponsor.details && (
                          <button
                            type="button"
                            className="button button-sm hover-lift"
                            onClick={() => setSelectedSponsor(sponsor)}
                            aria-haspopup="dialog"
                          >
                            Learn more
                          </button>
                        )}

                        {sponsor.links && sponsor.links.length > 0 && (
                          <div
                            className="sponsor-diamond-links"
                            aria-label={`${sponsor.name} links`}
                          >
                            {sponsor.links.map((link) => {
                              const isEmail = link.kind === "email";
                              const Icon =
                                link.kind === "facebook"
                                  ? FacebookLogo
                                  : link.kind === "instagram"
                                  ? InstagramLogo
                                  : link.kind === "whatsapp"
                                  ? WhatsappLogo
                                  : EnvelopeSimple;
                              const labelName =
                                link.kind === "email"
                                  ? "Email"
                                  : link.kind.charAt(0).toUpperCase() + link.kind.slice(1);
                              return (
                                <a
                                  key={link.kind}
                                  href={link.href}
                                  className="sponsor-diamond-link hover-lift"
                                  aria-label={`${sponsor.name} on ${labelName}`}
                                  {...(!isEmail
                                    ? { target: "_blank", rel: "noopener noreferrer" }
                                    : {})}
                                >
                                  <Icon size={20} aria-hidden="true" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={`sponsor-grid sponsor-grid-${tier}`}>
                  {tierSponsors.map((sponsor) => (
                    <SponsorTile
                      key={sponsor.id}
                      sponsor={sponsor}
                      tier={tier}
                      onSelect={setSelectedSponsor}
                    />
                  ))}
                </div>
              )}
            </section>
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

function SponsorTile({
  sponsor,
  tier,
  onSelect,
}: {
  sponsor: Sponsor;
  tier: SponsorTier;
  onSelect: (sponsor: Sponsor) => void;
}) {
  const isGold = tier === "gold";
  const hasDetails = !!sponsor.details;
  const hasHref = !!sponsor.href;
  const isInteractive = hasDetails || hasHref;

  const content = (
    <>
      <div
        className={`sponsor-tile-logo-box ${
          isGold ? "sponsor-gold-logo-box" : "sponsor-silver-logo-box"
        }`}
      >
        <Image
          src={sponsor.logo.src}
          alt={sponsor.logo.alt}
          width={sponsor.logo.width}
          height={sponsor.logo.height}
          className="sponsor-tile-logo"
        />
      </div>
      <span
        className={`sponsor-tile-name ${
          isGold ? "sponsor-gold-name" : "sponsor-silver-name"
        }`}
      >
        {sponsor.name}
      </span>
    </>
  );

  const className = `sponsor-tile sponsor-tile-${tier} ${
    isInteractive ? "hover-lift" : ""
  }`;

  if (hasDetails) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onSelect(sponsor)}
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
        href={sponsor.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={`Visit ${sponsor.name}`}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
