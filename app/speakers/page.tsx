import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { speakers } from "@/lib/content";

export const metadata: Metadata = {
  title: "Speakers | COMPASS",
  description:
    "Speaker announcements, full biographies, and session abstracts for COMPASS, the student-led medical conference at the Faculty of Medicine and Surgery, BSNU.",
};

export default function SpeakersPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Speakers</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>Meet the people behind the ideas, and take a closer look at what they will share.</p>
      </header>

      {speakers.length > 0 ? (
        <div className="page-body">
          {speakers.map((speaker) => (
            <article key={speaker.id} id={speaker.id} className="speaker-entry">
              {speaker.photoUrl && (
                <Image src={speaker.photoUrl} alt={speaker.name} width={320} height={400} />
              )}
              <h2>
                {speaker.name}{speaker.credentials ? `, ${speaker.credentials}` : ""}
              </h2>
              {(speaker.role || speaker.affiliation) && (
                <p className="status-line">{[speaker.role, speaker.affiliation].filter(Boolean).join(", ")}</p>
              )}
              <section className="prose" aria-labelledby={`bio-${speaker.id}`}>
                <h3 id={`bio-${speaker.id}`} className="section-heading">Biography</h3>
                {speaker.bio ? speaker.bio.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                )) : <p className="inline-notice">Biography coming soon.</p>}
              </section>
              <section className="prose" aria-labelledby={`abstract-${speaker.id}`}>
                <h3 id={`abstract-${speaker.id}`} className="section-heading">
                  {speaker.sessionTitle ?? "Session details coming soon"}
                </h3>
                {speaker.sessionAbstract ? (
                  <>
                    <h4>Session abstract</h4>
                    {speaker.sessionAbstract.split(/\n\s*\n/).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </>
                ) : <p className="inline-notice">Abstract coming soon.</p>}
              </section>
              {speaker.links.length > 0 && (
                <ul>
                  {speaker.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-link">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="page-body">
          <section className="empty-state reveal" aria-labelledby="speakers-coming-soon">
            <h2 id="speakers-coming-soon">Introductions are coming soon.</h2>
            <p>
              The speaker lineup has not been announced yet. Confirmed speakers will be listed
              here with their biographies and session abstracts.
            </p>
          </section>
          <aside className="margin-note" aria-labelledby="speakers-program">
            <h2 id="speakers-program" className="section-heading">From the person to the session</h2>
            <p>Once published, the agenda will help you place each talk in the program.</p>
            <Link href="/agenda" className="text-link">Explore the agenda</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
