import Image from "next/image";
import { conferenceWindow, formatEventDate, formatEventTimeRange } from "@/lib/event";
import { SITE_HOST, SITE_TAGLINE } from "@/lib/site";
import { CARD_LABELS } from "@/lib/registration-card-constants";

export interface AttendeeCardData {
  fullName: string;
  academicYear: string;
  university: string;
}

export function RegistrationCard({ attendee }: { attendee: AttendeeCardData }) {
  const eventDate = formatEventDate(conferenceWindow);
  const eventTime = formatEventTimeRange(conferenceWindow);

  return (
    <figure
      className="reg-card reveal"
      aria-label={`COMPASS attendee card for ${attendee.fullName}`}
    >
      <div className="reg-card-top">
        <div className="reg-card-brand">
          <Image
            src="/compass-logo.png"
            alt="COMPASS"
            width={1100}
            height={192}
            className="reg-card-logo"
            priority
          />
          <svg
            className="reg-card-pulse"
            viewBox="0 0 160 20"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              d="M 0,10 L 45,10 L 52,10 L 56,3 L 62,17 L 67,6 L 72,14 L 76,10 L 160,10"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="reg-card-badge">{CARD_LABELS.badge}</span>

        <h3 className="reg-card-name" dir="auto">
          {attendee.fullName}
        </h3>

        <p className="reg-card-meta">
          {attendee.academicYear} · {attendee.university}
        </p>
      </div>

      <div className="reg-card-bottom">
        <hr className="reg-card-divider" />

        <div className="reg-card-event">
          {eventDate ? <p className="reg-card-date">{eventDate}</p> : null}
          {eventTime ? <p className="reg-card-time">{eventTime}</p> : null}
          <p className="reg-card-venue">{CARD_LABELS.venue}</p>
        </div>

        <footer className="reg-card-footer">
          <p className="reg-card-tagline">{SITE_TAGLINE}</p>
          <span className="reg-card-host">{SITE_HOST}</span>
        </footer>
      </div>
    </figure>
  );
}
