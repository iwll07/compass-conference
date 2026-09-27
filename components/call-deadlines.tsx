// Key dates for the Speaker / Posters call, shared by the speakers and posters
// pages so the two notes can never disagree. The presentation date is derived
// from conferenceWindow rather than hardcoded, so moving the conference date
// updates these notes automatically.
import { conferenceWindow, formatEventDate } from "@/lib/event";
import { callDeadlines, formatCallDate } from "@/lib/calls";

export function CallDeadlines() {
  const presentation = formatEventDate(conferenceWindow);
  const rows: [string, string][] = [
    ["Submission deadline", formatCallDate(callDeadlines.submissionDeadline)],
    ["Notification of acceptance", formatCallDate(callDeadlines.notificationOfAcceptance)],
  ];
  if (presentation) rows.push(["Presentation date", presentation]);

  return (
    <dl className="call-deadlines">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
