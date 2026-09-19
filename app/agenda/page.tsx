import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { PrintButton } from "@/components/print-button";
import { schedule, type Session } from "@/lib/content";
import { conferenceWindow, formatEventWindow } from "@/lib/event";

const eventLine = formatEventWindow(conferenceWindow);

export const metadata: Metadata = {
  title: "Agenda | COMPASS",
  description: eventLine
    ? `Program updates and a printable agenda for COMPASS at the Faculty of Medicine and Surgery, BSNU. ${eventLine}.`
    : "Program updates and a printable agenda for COMPASS at the Faculty of Medicine and Surgery, BSNU. Conference date and times to be announced.",
};

const kindLabels: Record<Session["kind"], string> = {
  keynote: "Keynote",
  panel: "Panel",
  workshop: "Workshop",
  session: "Session",
  break: "Break",
  social: "Social",
};

export default function AgendaPage() {
  const days = [...new Set(schedule.map((session) => session.day))];

  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1>Agenda</h1>
        <p>Your guide to COMPASS, with sessions and timings in one place once the program is confirmed.</p>
      </header>

      <div className="page-body">
        <div>
          <p className="status-line">{eventLine ?? "Conference date and time: to be announced"}</p>
          <p className="print-only">COMPASS · Faculty of Medicine and Surgery, BSNU</p>
          <PrintButton />
        </div>
        <aside className="margin-note">
          <p>Use the print button to make a paper copy or save this agenda as a PDF through your browser.</p>
        </aside>
      </div>

      {schedule.length > 0 ? (
        <div className="agenda-list">
          {days.map((day, index) => (
            <section key={day ?? "unscheduled"} aria-labelledby={`agenda-day-${index}`}>
              <h2 id={`agenda-day-${index}`} className="section-heading">{day ?? "Date TBD"}</h2>
              <ol className="agenda-list">
                {schedule.filter((session) => session.day === day).map((session) => (
                  <li key={session.id} className="agenda-item">
                    <p className="session-time">{session.time ?? "Time TBD"}</p>
                    <article>
                      <h3>{session.title}</h3>
                      <p className="status-line">{kindLabels[session.kind]}</p>
                      <p>{session.location ?? "Room to be announced"}</p>
                      {session.description && <p>{session.description}</p>}
                      {session.speakers.length > 0 && (
                        <p>
                          {session.speakers.join(", ")} · {" "}
                          <Link href="/speakers" className="text-link">Speaker details</Link>
                        </p>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <section className="empty-state" aria-labelledby="agenda-coming-soon">
          <Compass className="empty-mark" size={64} weight="light" aria-hidden="true" />
          <h2 id="agenda-coming-soon">The program is coming soon.</h2>
          <p>
            Session titles, rooms, and timings will appear here once confirmed.
            There is no published schedule yet.
          </p>
          <Link href="/speakers" className="text-link">Speaker announcements</Link>
        </section>
      )}
    </main>
  );
}
