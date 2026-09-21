import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sponsors } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sponsors | COMPASS",
  description:
    "Sponsor announcements for COMPASS, the student-led medical conference at the Faculty of Medicine and Surgery, BSNU. Partnership details coming soon.",
};

export default function SponsorsPage() {
  const tiers = [...new Set(sponsors.map((sponsor) => sponsor.tier))];

  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Sponsors &amp; partners</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>Support for a student-led space to learn, share research, and ask better questions.</p>
      </header>

      {sponsors.length > 0 ? (
        <div className="page-body">
          {tiers.map((tier, index) => (
            <section key={tier} aria-labelledby={`sponsor-tier-${index}`}>
              <h2 id={`sponsor-tier-${index}`} className="section-heading">{tier}</h2>
              <div className="content-grid">
                {sponsors.filter((sponsor) => sponsor.tier === tier).map((sponsor) => (
                  <article key={sponsor.id} className="sponsor-entry">
                    {sponsor.logoUrl && (
                      <Image
                        src={sponsor.logoUrl}
                        alt={`${sponsor.name} logo`}
                        width={240}
                        height={120}
                        style={{ maxWidth: "100%", objectFit: "contain" }}
                      />
                    )}
                    <h3>{sponsor.name}</h3>
                    {sponsor.blurb ? <p>{sponsor.blurb}</p> : (
                      <p className="inline-notice">More about this supporter coming soon.</p>
                    )}
                    {sponsor.website && (
                      <Link href={sponsor.website} className="text-link">Visit {sponsor.name}</Link>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="empty-state reveal" aria-labelledby="sponsors-coming-soon">
          <h2 id="sponsors-coming-soon">Our supporters, soon.</h2>
          <p>
            Sponsors and partners have not been announced. Confirmed organizations will appear
            here, grouped by their sponsorship tier, with a short introduction and a link to learn more.
          </p>
        </section>
      )}

      <section className="prose reveal" aria-labelledby="partnership-heading">
        <h2 id="partnership-heading" className="section-heading">Supporting COMPASS</h2>
        <p>
          COMPASS is student-led at the Faculty of Medicine and Surgery, Beni Suef National
          University. Partnership information and a contact for sponsorship enquiries are coming soon.
        </p>
        <Link href="/about" className="text-link">About the conference</Link>
      </section>
    </main>
  );
}
