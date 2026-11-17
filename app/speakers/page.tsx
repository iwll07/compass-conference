import type { Metadata } from "next";
import Link from "next/link";
import { speakers } from "@/lib/content";
import { CallDeadlines } from "@/components/call-deadlines";
import { SpeakerCard } from "@/components/speaker-card";

export const metadata: Metadata = {
  title: "Speakers | COMPASS",
  description:
    "Meet the confirmed speakers at COMPASS, the student-led medical conference at the Faculty of Medicine, Beni Suef National University (BSNU).",
};

export default function SpeakersPage() {
  const grandSpeakers = speakers.filter((speaker) => speaker.group === "grand");
  const studentSpeakers = speakers.filter((speaker) => speaker.group === "student");

  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Speakers</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>Meet the people behind the ideas, and take a closer look at what they will share.</p>
      </header>

      {speakers.length > 0 ? (
        <div className="speakers-body">
          <section className="speakers-lineup" aria-labelledby="speakers-grand-heading">
            <div className="speakers-lineup-header reveal">
              <h2 id="speakers-grand-heading">Grand Speakers</h2>
              <p>
                Session titles and abstracts will be published here as the programme is confirmed.
              </p>
            </div>

            <div className="speakers-grid">
              {grandSpeakers.map((speaker, index) => (
                <SpeakerCard key={speaker.id} speaker={speaker} index={index} />
              ))}
            </div>
          </section>

          <section className="speakers-lineup speakers-lineup--students" aria-labelledby="speakers-student-heading">
            <div className="speakers-lineup-header reveal">
              <h2 id="speakers-student-heading">Student Speakers</h2>
              <p>
                Meet the students presenting at COMPASS. More details will be shared as the
                programme takes shape.
              </p>
            </div>

            <div className="speakers-grid speakers-grid--students">
              {studentSpeakers.map((speaker, index) => (
                <SpeakerCard key={speaker.id} speaker={speaker} index={index} />
              ))}
            </div>
          </section>

          <p className="speakers-guests-note reveal">
            Patrons and distinguished guests are introduced on the{" "}
            <Link href="/about#patrons">About page</Link>.
          </p>

          <div className="speakers-notes">
            <aside className="margin-note reveal" aria-labelledby="speakers-program">
              <h2 id="speakers-program" className="section-heading">From the person to the session</h2>
              <p>Once published, the agenda will help you place each talk in the program.</p>
              <Link href="/agenda" className="text-link">Explore the agenda</Link>
            </aside>
            <aside className="margin-note reveal" aria-labelledby="speakers-call" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
              <h2 id="speakers-call" className="section-heading">Want to speak at COMPASS?</h2>
              <p>
                Speaker proposals are now closed. The submission deadline passed on 11 October 2026, and
                proposals received are currently under review — thank you to everyone who put one forward.
              </p>
              <CallDeadlines />
              <p>Selected speakers will be announced here, with session details as the programme takes shape.</p>
            </aside>
          </div>
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
          <aside className="margin-note" aria-labelledby="speakers-call">
            <h2 id="speakers-call" className="section-heading">Want to speak at COMPASS?</h2>
            <p>
              Speaker proposals are now closed. The submission deadline passed on 11 October 2026, and
              proposals received are currently under review — thank you to everyone who put one forward.
            </p>
            <CallDeadlines />
            <p>Selected speakers will be announced here, with session details as the programme takes shape.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
