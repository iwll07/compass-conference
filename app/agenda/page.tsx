import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { PrintButton } from "@/components/print-button";
import { AgendaView } from "@/components/agenda-view";
import { schedule, speakers } from "@/lib/content";
import { conferenceWindow, formatEventWindow } from "@/lib/event";

const eventLine = formatEventWindow(conferenceWindow);
const hasProgram = schedule.length > 0;

export const metadata: Metadata = {
  title: "Agenda | COMPASS",
  description: hasProgram
    ? `Your guide to the day: sessions, speakers and halls in one place. ${eventLine ?? "Programme announced."}`
    : eventLine
      ? `Program updates and a printable agenda for COMPASS at the Faculty of Medicine, BSNU. ${eventLine}.`
      : "Program updates and a printable agenda for COMPASS at the Faculty of Medicine, BSNU. Conference date and times to be announced.",
};

export default function AgendaPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Agenda</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          {hasProgram
            ? "Your guide to the day: sessions, speakers and halls in one place."
            : "Your guide to COMPASS, with sessions and timings in one place once the program is confirmed."}
        </p>
      </header>

      <div className="page-body reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
        <div>
          <p className="status-line">{eventLine ?? "Conference date and time: to be announced"}</p>
          <p className="print-only">COMPASS · Faculty of Medicine, BSNU</p>
          <div className="agenda-actions no-print">
            <PrintButton />
            <a
              className="button agenda-download"
              href="/AGENDA.pdf"
              download="COMPASS-Conference-Agenda.pdf"
            >
              Download the agenda (PDF)
            </a>
          </div>
        </div>
        <aside className="margin-note">
          <p>
            {hasProgram
              ? "Times are in Cairo time. Any changes will be announced on this site."
              : "A downloadable agenda will be published here once the program is confirmed."}
          </p>
        </aside>
      </div>

      {hasProgram ? (
        <AgendaView sessions={schedule} speakers={speakers} />
      ) : (
        <section className="empty-state reveal" aria-labelledby="agenda-coming-soon">
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
