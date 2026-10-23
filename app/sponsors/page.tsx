import type { Metadata } from "next";
import Link from "next/link";
import { sponsors } from "@/lib/sponsors";
import { SponsorsView } from "@/components/sponsors-view";

export const metadata: Metadata = {
  title: "Sponsors | COMPASS",
  description:
    "Sponsors and partners for COMPASS, the student-led medical conference at the Faculty of Medicine, Beni Suef National University.",
};

export default function SponsorsPage() {
  const hasSponsors = sponsors.length > 0;

  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Sponsors &amp; partners</h1>
        <p
          className="reveal"
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
        >
          Support for a student-led space to learn, share research, and ask better
          questions.
        </p>
      </header>

      <SponsorsView sponsors={sponsors} />

      {!hasSponsors && (
        <section className="prose reveal" aria-labelledby="partnership-heading">
          <h2 id="partnership-heading" className="section-heading">
            Supporting COMPASS
          </h2>
          <p>
            COMPASS is student-led at the Faculty of Medicine, Beni Suef National
            University. Partnership information and a contact for sponsorship enquiries
            are coming soon.
          </p>
          <Link href="/about" className="text-link">
            About the conference
          </Link>
        </section>
      )}
    </main>
  );
}
