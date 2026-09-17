"use client";

import { useEffect, useState } from "react";
import { conferenceWindow, getEventState, type EventWindow } from "@/lib/event";

export function Countdown({ event = conferenceWindow }: { event?: EventWindow | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  const state = getEventState(event, now ?? Number.NaN);
  if (state.phase === "unannounced") return <div className="event-clock"><span className="status-dot" aria-hidden="true" /><div><strong>{event && now === null ? "Preparing the countdown" : "A date worth looking forward to."}</strong><p>{event && now === null ? "Event timing is loading." : "Conference date to be announced."}</p></div></div>;
  if (state.phase === "live") return <div className="event-clock" role="status"><span className="status-dot" aria-hidden="true" /><div><strong>COMPASS is underway.</strong><p>Follow the day on the agenda.</p></div></div>;
  if (state.phase === "ended") return <div className="event-clock" role="status"><div><strong>The conference has concluded.</strong><p>Thank you for being part of COMPASS.</p></div></div>;
  return <div className="countdown" role="timer" aria-label="Time until COMPASS"><div className="countdown-values">{(["days", "hours", "minutes", "seconds"] as const).map((unit) => <span key={unit}><strong>{String(state[unit]).padStart(2, "0")}</strong><small>{unit}</small></span>)}</div><p>{new Intl.DateTimeFormat("en-GB", { timeZone: event!.timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date(event!.startsAt))} · {event!.timeZone}</p></div>;
}
