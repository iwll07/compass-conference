import type { Metadata } from "next";
import Link from "next/link";
import { committee } from "@/lib/content";

export const metadata: Metadata = {
  title: "About | COMPASS",
  description:
    "Meet COMPASS, a student-led medical conference at the Faculty of Medicine and Surgery, Beni Suef National University (BSNU).",
};

export default function AboutPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">About COMPASS</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>A medical conference shaped by students, for the questions that keep us curious.</p>
      </header>

      <div className="page-body">
        <div className="prose reveal">
          <h2 className="section-heading">Learning starts with a question.</h2>
          <p>
            Studying medicine means having questions. Some begin in a lecture; others stay with us
            long after we close a textbook. There is value in making room to ask them together.
          </p>
          <p>
            COMPASS is a student-led medical conference at the Faculty of Medicine and Surgery,
            Beni Suef National University (BSNU). We want it to be a place to share ideas, listen
            carefully, and learn from one another.
          </p>
          <p>
            You don&rsquo;t need to have every answer to be curious about medicine. That curiosity
            is a good place to begin.
          </p>
        </div>
        <aside className="margin-note reveal" aria-labelledby="about-details" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          <h2 id="about-details" className="section-heading">As details take shape</h2>
          <p>
            The program and speaker announcements will be published when confirmed.
          </p>
          <Link href="/agenda" className="text-link">Explore the agenda</Link>
        </aside>
      </div>

      <section aria-labelledby="committee-heading" className="reveal">
        <h2 id="committee-heading" className="section-heading">The people behind COMPASS</h2>
        {committee.length > 0 ? (
          <dl className="content-grid">
            {committee.map((member) => (
              <div key={`${member.role}-${member.name}`} className="speaker-entry">
                <dt>{member.role}</dt>
                <dd>{member.name ?? "Name coming soon"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="inline-notice">
            <p className="status-line">Committee names coming soon</p>
            <p>Meet the organizing committee here once names and roles are confirmed.</p>
          </div>
        )}
      </section>
    </main>
  );
}
