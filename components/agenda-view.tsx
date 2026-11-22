"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session, Speaker } from "@/lib/content";
import {
  formatDay,
  formatTime,
  getSpeakerInitials,
  groupRows,
  hallColumns,
  isBreak,
  isEventBar,
  isSpeakerCard,
  spansAllHalls,
} from "@/lib/agenda";

const HALL_FILTER_KEY = "compass-agenda-hall";

const kindLabels: Record<Session["kind"], string> = {
  opening: "Opening",
  keynote: "Keynote",
  session: "Session",
  panel: "Panel",
  workshop: "Workshop",
  posters: "Posters",
  break: "Break",
  social: "Social",
  closing: "Closing",
};

function photoFor(speaker: Speaker): string | null {
  return speaker.photoUrl ? `/speakers/${speaker.id}.webp` : null;
}

function isLinkedSpeaker(speaker: Speaker): boolean {
  return speaker.group === "grand" || speaker.group === "student";
}

function SpeakerPhoto({
  speaker,
  className,
}: {
  speaker: Speaker;
  className: string;
}) {
  const photo = photoFor(speaker);
  if (!photo) {
    return (
      <span className={className} aria-hidden="true">
        <span className="agenda-initials">{getSpeakerInitials(speaker.name)}</span>
      </span>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      <Image
        src={photo}
        alt=""
        width={480}
        height={480}
        sizes="(max-width: 899px) 78px, 150px"
        className="agenda-photo-img"
      />
    </span>
  );
}

function SessionCard({
  session,
  speakersById,
  hallName,
  gridColumn,
}: {
  session: Session;
  speakersById: Map<string, Speaker>;
  hallName: string | null;
  gridColumn: string;
}) {
  const headingId = useId();
  const people = session.speakers
    .map((id) => speakersById.get(id))
    .filter((person): person is Speaker => Boolean(person));
  const keynote = session.kind === "keynote";
  const many = people.length > 1;
  const panel = people.length > 3;
  const label = `${kindLabels[session.kind]}${hallName ? ` · ${hallName}` : ""}`;

  return (
    <article
      className={`agenda-card${keynote ? " agenda-card--keynote" : ""}${panel ? " agenda-card--many" : ""}`}
      aria-labelledby={headingId}
      style={{ gridColumn }}
    >
      <div className="agenda-card-copy">
        <p className="agenda-card-kind">{label}</p>
        {many ? (
          <ul className="agenda-people">
            {people.map((person) => (
              <li key={person.id}>
                {isLinkedSpeaker(person) ? (
                  <Link href={`/speakers/#${person.id}`} className="agenda-person-link">
                    <span dir="auto">{person.name}</span>
                  </Link>
                ) : (
                  <span dir="auto">{person.name}</span>
                )}
                {(person.role || person.affiliation) && (
                  <span className="agenda-person-role" dir="auto">
                    {[person.role, person.affiliation].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : people[0] ? (
          <h3 id={headingId} className="agenda-card-name" dir="auto">
            {isLinkedSpeaker(people[0]) ? (
              <Link href={`/speakers/#${people[0].id}`} className="agenda-person-link">
                {people[0].name}
              </Link>
            ) : (
              people[0].name
            )}
          </h3>
        ) : (
          <h3 id={headingId} className="agenda-card-name" dir="auto">
            {session.title}
          </h3>
        )}
        {people[0] && (people[0].role || people[0].affiliation) && !many && (
          <p className="agenda-card-role" dir="auto">
            {[people[0].role, people[0].affiliation].filter(Boolean).join(" · ")}
          </p>
        )}
        {people.length > 0 && (
          <p className="agenda-card-title" dir="auto">
            {session.title}
          </p>
        )}
        {session.description && (
          <p className="agenda-card-desc" dir="auto">
            {session.description}
          </p>
        )}
      </div>
      {panel ? (
        // Every PNG in the strip, arranged 2 + 2 + 3 for the seven guests.
        <div className="agenda-panel-strip" aria-hidden="true">
          {[people.slice(0, 2), people.slice(2, 4), people.slice(4)].map(
            (row, rowIndex) =>
              row.length > 0 ? (
                <div className="agenda-panel-row" key={rowIndex}>
                  {row.map((person) => {
                    const photo = photoFor(person);
                    return (
                      <span key={person.id} className="agenda-panel-person">
                        {photo ? (
                          <Image
                            src={photo}
                            alt=""
                            width={480}
                            height={480}
                            sizes="96px"
                            className="agenda-panel-img"
                          />
                        ) : (
                          <span className="agenda-initials">
                            {getSpeakerInitials(person.name)}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : null
          )}
        </div>
      ) : people.length > 1 ? (
        // Two or three presenters share ONE wider slanted strip.
        <div className="agenda-photo agenda-photo--group" aria-hidden="true">
          {people.map((person) => {
            const photo = photoFor(person);
            return (
              <span key={person.id} className="agenda-group-person">
                {photo ? (
                  <Image
                    src={photo}
                    alt=""
                    width={480}
                    height={480}
                    sizes="132px"
                    className="agenda-group-img"
                  />
                ) : (
                  <span className="agenda-initials">
                    {getSpeakerInitials(person.name)}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      ) : people[0] ? (
        <SpeakerPhoto speaker={people[0]} className="agenda-photo" />
      ) : null}
    </article>
  );
}

function SessionBlock({
  session,
  speakersById,
  halls,
}: {
  session: Session;
  speakersById: Map<string, Speaker>;
  halls: string[];
}) {
  const hallName = session.hall;
  const index = hallName ? halls.indexOf(hallName) : -1;
  const gridColumn =
    halls.length === 0 || spansAllHalls(session) || index < 0
      ? "1 / -1"
      : `${index + 1}`;
  const gridStyle = { gridColumn };

  if (isBreak(session)) {
    return (
      <div className="agenda-break" style={gridStyle} dir="auto">
        {session.title}
      </div>
    );
  }
  if (isSpeakerCard(session)) {
    return (
      <SessionCard
        session={session}
        speakersById={speakersById}
        hallName={hallName}
        gridColumn={gridColumn}
      />
    );
  }
  if (isEventBar(session)) {
    return (
      <div className="agenda-event" style={gridStyle} dir="auto">
        <span>{session.title}</span>
        {hallName && <span className="agenda-event-hall">{hallName}</span>}
      </div>
    );
  }
  return null;
}

export function AgendaView({
  sessions,
  speakers,
}: {
  sessions: Session[];
  speakers: Speaker[];
}) {
  const days = useMemo(
    () => [...new Set(sessions.map((session) => session.day))].sort(),
    [sessions]
  );
  const speakersById = useMemo(
    () => new Map(speakers.map((speaker) => [speaker.id, speaker])),
    [speakers]
  );
  const [activeDay, setActiveDay] = useState(days[0] ?? "");
  const [hallFilter, setHallFilter] = useState("all");

  useEffect(() => {
    let active = true;
    // Deferred so the server-rendered "all" state hydrates before the stored
    // filter is applied; no mismatch between HTML and the first client render.
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = window.sessionStorage.getItem(HALL_FILTER_KEY);
        if (saved) setHallFilter(saved);
      } catch {
        // Storage can be unavailable in private browsing; "all" is fine.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function chooseHall(hall: string) {
    setHallFilter(hall);
    try {
      window.sessionStorage.setItem(HALL_FILTER_KEY, hall);
    } catch {
      // Nothing to persist; the in-memory filter still works.
    }
  }

  const visible = (session: Session) =>
    hallFilter === "all" || spansAllHalls(session) || session.hall === hallFilter;

  return (
    <div className="agenda-program">
      {days.length > 1 && (
        <div className="agenda-day-tabs" role="tablist" aria-label="Conference days">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={day === activeDay}
              className={`agenda-day-tab${day === activeDay ? " is-active" : ""}`}
              onClick={() => setActiveDay(day)}
            >
              {formatDay(day)}
            </button>
          ))}
        </div>
      )}

      {days.map((day, dayIndex) => {
        const daySessions = sessions.filter((session) => session.day === day);
        const halls = hallColumns(daySessions, day);
        const rows = groupRows(daySessions);
        const active = day === activeDay;
        return (
          <section
            key={day}
            className="agenda-day"
            aria-labelledby={`agenda-day-${day}`}
            hidden={!active}
          >
            <h2
              id={`agenda-day-${day}`}
              className="section-heading reveal"
              style={{ "--reveal-delay": `${dayIndex * 80}ms` } as React.CSSProperties}
            >
              {formatDay(day)}
            </h2>

            {halls.length > 0 && (
              <div className="agenda-hall-filters" aria-label="Filter by hall">
                <span className="agenda-hall-filters-label">Show</span>
                {["all", ...halls].map((hall) => (
                  <button
                    key={hall}
                    type="button"
                    className={`agenda-hall-filter${
                      hallFilter === hall ? " is-active" : ""
                    }`}
                    aria-pressed={hallFilter === hall}
                    onClick={() => chooseHall(hall)}
                  >
                    {hall === "all" ? "All" : hall}
                  </button>
                ))}
              </div>
            )}

            <div
              className="agenda-matrix"
              style={{ "--hall-count": halls.length } as React.CSSProperties}
            >
              {halls.length > 0 && (
                <div className="agenda-matrix-head">
                  <span>Time</span>
                  {halls.map((hall) => (
                    <span key={hall}>{hall}</span>
                  ))}
                </div>
              )}
              {rows.map((row) => {
                const shown = row.sessions.filter(visible);
                if (shown.length === 0) return null;
                return (
                  <div className="agenda-row" key={row.key}>
                    <div className="agenda-time">
                      <time dateTime={`${row.day}T${row.start}`}>
                        {formatTime(row.start)}
                      </time>
                      <time dateTime={`${row.day}T${row.end}`} className="agenda-time-end">
                        – {formatTime(row.end)}
                      </time>
                    </div>
                    <div className="agenda-row-body">
                      {shown.map((session) => (
                        <SessionBlock
                          key={session.id}
                          session={session}
                          speakersById={speakersById}
                          halls={halls}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
