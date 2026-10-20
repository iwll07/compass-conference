import { conferenceWindow } from "@/lib/event";
import { generateIcsString } from "@/lib/calendar";

export const dynamic = "force-static";

export function GET() {
  const ics = generateIcsString(conferenceWindow);
  return new Response(ics ?? "", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="compass.ics"',
    },
  });
}
