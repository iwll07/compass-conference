import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { honoreeGroups, getInitials } from "@/lib/honorees";

export const metadata: Metadata = {
  title: "About | COMPASS",
  description:
    "Meet COMPASS, a student-led medical conference at the Faculty of Medicine, Beni Suef National University (BSNU).",
};

export default function AboutPage() {
  const visibleGroups = honoreeGroups.filter((group) => group.people.length > 0);

  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">About COMPASS</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          A medical conference shaped by students, for the questions that keep us curious.
        </p>
      </header>

      <div className="page-body">
        <div className="prose reveal">
          <h2 className="section-heading">Learning starts with a question.</h2>
          <p>
            Studying medicine means having questions. Some begin in a lecture; others stay with us
            long after we close a textbook. There is value in making room to ask them together.
          </p>
          <p>
            COMPASS is a student-led medical conference at the Faculty of Medicine,
            Beni Suef National University (BSNU). We want it to be a place to share ideas, listen
            carefully, and learn from one another.
          </p>
          <p>
            You don&rsquo;t need to have every answer to be curious about medicine. That curiosity
            is a good place to begin.
          </p>
        </div>
        <aside
          className="margin-note reveal"
          aria-labelledby="about-details"
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
        >
          <h2 id="about-details" className="section-heading">As details take shape</h2>
          <p>
            The program and speaker announcements will be published when confirmed.
          </p>
          <Link href="/agenda" className="text-link">Explore the agenda</Link>
        </aside>
      </div>

      <section id="patrons" aria-labelledby="patrons-heading" className="patrons-section reveal">
        <div className="patrons-header">
          <h2 id="patrons-heading" className="section-heading">Patrons and special guests</h2>
          <p className="patrons-intro">
            COMPASS is honoured by the support of the university&apos;s leadership and by the presence of distinguished guests.
          </p>
        </div>

        {visibleGroups.map((group) => (
          <div key={group.id} className="patrons-group">
            <h3 className="patrons-group-label">{group.label}</h3>
            <div className="patrons-grid">
              {group.people.map((person) => {
                const initials = getInitials(person.name);
                return (
                  <article key={person.id} className="patron-card">
                    <div className="patron-card-photo-wrap">
                      {person.photo ? (
                        <Image
                          src={person.photo.card.src}
                          alt={person.name}
                          width={person.photo.card.width}
                          height={person.photo.card.height}
                          loading="lazy"
                          className="patron-card-photo"
                        />
                      ) : (
                        <div className="patron-card-fallback-circle" aria-hidden="true">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="patron-card-content">
                      <h4 className="patron-card-name">{person.name}</h4>
                      <p className="patron-card-title">{person.title}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
