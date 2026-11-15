"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  WhatsappLogo,
  Globe,
  EnvelopeSimple,
  MapPin,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { type Sponsor, type SponsorLinkKind } from "@/lib/sponsors";
import { SponsorDialog } from "@/components/sponsor-dialog";

interface SponsorsViewProps {
  sponsors: Sponsor[];
}

const LINK_META: Record<SponsorLinkKind, { icon: typeof FacebookLogo; name: string }> = {
  facebook: { icon: FacebookLogo, name: "Facebook" },
  instagram: { icon: InstagramLogo, name: "Instagram" },
  whatsapp: { icon: WhatsappLogo, name: "WhatsApp" },
  website: { icon: Globe, name: "Website" },
  email: { icon: EnvelopeSimple, name: "Email" },
  location: { icon: MapPin, name: "Location" },
};

function linkAriaLabel(sponsor: Sponsor, kind: SponsorLinkKind, name: string): string {
  if (kind === "website") return `Visit ${sponsor.name} website`;
  if (kind === "location") return `Location of ${sponsor.name} on Google Maps`;
  return `${sponsor.name} on ${name}`;
}

export function SponsorsView({ sponsors }: SponsorsViewProps) {
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

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

  return (
    <>
      <div className="sponsors-page-body">
        <section className="sponsor-section reveal" aria-label="Our sponsors">
          <div className="sponsor-stack">
            {sponsors.map((sponsor) => {
              // A sponsor with no description renders as a smaller single-row
              // panel; everything else uses the full panel with summary + button.
              const isCompact = !sponsor.summary && !sponsor.details;
              const sponsorLinks = sponsor.links;

              const links = sponsorLinks && sponsorLinks.length > 0 ? (
                <div className="sponsor-panel-links" aria-label={`${sponsor.name} links`}>
                  {sponsorLinks.map((link) => {
                    const isEmail = link.kind === "email";
                    const { icon: Icon, name } = LINK_META[link.kind];
                    return (
                      <a
                        key={link.kind}
                        href={link.href}
                        className="sponsor-panel-link hover-lift"
                        aria-label={linkAriaLabel(sponsor, link.kind, name)}
                        {...(!isEmail
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        <Icon size={24} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              ) : null;

              if (isCompact) {
                return (
                  <article key={sponsor.id} className="sponsor-panel sponsor-panel-compact">
                    {/* Same header row as a full panel, but with no divider,
                        summary or button — there is no description to show, so
                        the brand block itself opens the links-only dialog. */}
                    <div className="sponsor-panel-header">
                      <button
                        type="button"
                        className="sponsor-panel-compact-btn"
                        onClick={() => setSelectedSponsor(sponsor)}
                        aria-haspopup="dialog"
                        aria-label={`About ${sponsor.name}`}
                      >
                        <div className="sponsor-panel-brand">
                          <Image
                            src={sponsor.logo.src}
                            alt={sponsor.logo.alt}
                            width={sponsor.logo.width}
                            height={sponsor.logo.height}
                            className="sponsor-panel-logo"
                          />
                          <div className="sponsor-panel-titles">
                            <h3 className="sponsor-panel-name">{sponsor.name}</h3>
                            {sponsor.tagline && (
                              <p className="sponsor-panel-tagline">{sponsor.tagline}</p>
                            )}
                          </div>
                        </div>
                      </button>
                      {links}
                    </div>
                  </article>
                );
              }

              return (
                <article key={sponsor.id} className="sponsor-panel">
                  {/* Row 1, header: Logo + Name/Tagline on left, icon links on right */}
                  <div className="sponsor-panel-header">
                    <div className="sponsor-panel-brand">
                      <Image
                        src={sponsor.logo.src}
                        alt={sponsor.logo.alt}
                        width={sponsor.logo.width}
                        height={sponsor.logo.height}
                        className="sponsor-panel-logo"
                      />
                      <div className="sponsor-panel-titles">
                        <h3 className="sponsor-panel-name">{sponsor.name}</h3>
                        {sponsor.tagline && (
                          <p className="sponsor-panel-tagline">{sponsor.tagline}</p>
                        )}
                      </div>
                    </div>

                    {links}
                  </div>

                  {/* 1px divider */}
                  <div className="sponsor-panel-divider" role="separator" />

                  {/* Row 2: Summary paragraph */}
                  {sponsor.summary && (
                    <p className="sponsor-panel-summary">{sponsor.summary}</p>
                  )}

                  {/* Row 3: Learn more button */}
                  {sponsor.details && (
                    <button
                      type="button"
                      className="button sponsor-panel-btn hover-lift"
                      onClick={() => setSelectedSponsor(sponsor)}
                      aria-haspopup="dialog"
                    >
                      <span>Learn more</span>
                      <ArrowRightIcon size={16} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Note below the sponsors when any exist */}
        <section
          className="sponsor-support-section reveal"
          aria-labelledby="partnership-heading"
        >
          <h2 id="partnership-heading" className="sponsor-support-heading">
            Supporting COMPASS
          </h2>
          <p className="sponsor-support-copy">
            Other partners and sponsors have not been announced yet. Once confirmed they will be announced here along the way.
          </p>
          <Link href="/about" className="text-link">
            About the conference
          </Link>
        </section>
      </div>

      <SponsorDialog
        sponsor={selectedSponsor}
        onClose={() => setSelectedSponsor(null)}
      />
    </>
  );
}
