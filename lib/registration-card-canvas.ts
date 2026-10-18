import { conferenceWindow, formatEventDate, formatEventTimeRange } from "@/lib/event";
import { SITE_HOST, SITE_TAGLINE } from "@/lib/site";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_COLORS,
  CARD_LABELS,
} from "@/lib/registration-card-constants";

export interface AttendeeCanvasData {
  fullName: string;
  academicYear: string;
  university: string;
  universityOther?: string | null;
}

/**
 * Draws the attendee card to an off-screen HTML5 Canvas and exports or shares it.
 * Zero external dependencies — uses only the browser's native 2D Canvas context.
 */
export async function exportCardAsImage(attendee: AttendeeCanvasData): Promise<void> {
  // 1. Wait for site webfonts to ensure crisp rendering
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await Promise.allSettled([
        document.fonts.load("400 64px 'Source Serif 4'"),
        document.fonts.load("italic 400 30px 'Source Serif 4'"),
        document.fonts.load("600 36px 'Public Sans'"),
        document.fonts.load("700 24px 'Public Sans'"),
      ]);
      await document.fonts.ready;
    } catch {
      // Font loading failure fallback: standard system fonts
    }
  }

  // 2. Load the brand logo
  const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/compass-logo.png";
  });

  // 3. Create off-screen canvas at 1080x1350
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background (white card)
  ctx.fillStyle = CARD_COLORS.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Outer border
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, CARD_WIDTH - 3, CARD_HEIGHT - 3);

  const padX = 84;
  const contentWidth = CARD_WIDTH - padX * 2;

  // Header: Brand logo + ECG Pulse line
  let currY = 88;
  if (logoImg) {
    const logoW = 290;
    const logoH = (logoW * 192) / 1100; // ~50.6px
    ctx.drawImage(logoImg, padX, currY, logoW, logoH);

    // ECG pulse line on the right
    const pulseX = CARD_WIDTH - padX - 180;
    const pulseY = currY + logoH / 2;
    ctx.save();
    ctx.strokeStyle = CARD_COLORS.accent;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pulseX, pulseY);
    ctx.lineTo(pulseX + 45, pulseY);
    ctx.lineTo(pulseX + 53, pulseY);
    ctx.lineTo(pulseX + 58, pulseY - 24);
    ctx.lineTo(pulseX + 66, pulseY + 24);
    ctx.lineTo(pulseX + 72, pulseY - 14);
    ctx.lineTo(pulseX + 78, pulseY + 12);
    ctx.lineTo(pulseX + 84, pulseY);
    ctx.lineTo(pulseX + 180, pulseY);
    ctx.stroke();
    ctx.restore();

    currY += logoH + 50;
  } else {
    currY += 80;
  }

  // Label: "REGISTERED"
  ctx.save();
  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = '700 24px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0.18em";
  }
  ctx.fillText(CARD_LABELS.badge, padX, currY);
  ctx.restore();

  currY += 44;

  // Registrant Name (large serif heading font, balanced wrap to <= 3 lines, RTL aware)
  const isArabic = /[\u0600-\u06FF]/.test(attendee.fullName);
  ctx.save();
  ctx.fillStyle = CARD_COLORS.ink;
  ctx.font = '400 70px "Source Serif 4", Georgia, serif';
  ctx.textBaseline = "top";
  ctx.direction = isArabic ? "rtl" : "ltr";
  ctx.textAlign = isArabic ? "right" : "left";

  const nameX = isArabic ? CARD_WIDTH - padX : padX;
  const words = attendee.fullName.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > contentWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === 2) break; // at most 3 lines
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = 86;
  for (const line of lines.slice(0, 3)) {
    ctx.fillText(line, nameX, currY);
    currY += lineHeight;
  }
  ctx.restore();

  currY += 18;

  // Subheading: {Academic year} · {University}
  ctx.save();
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '400 32px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  ctx.direction = isArabic ? "rtl" : "ltr";
  ctx.textAlign = isArabic ? "right" : "left";
  const displayUniversity =
    attendee.university === "Other" && attendee.universityOther?.trim()
      ? attendee.universityOther.trim()
      : attendee.university;
  const metaText = `${attendee.academicYear} · ${displayUniversity}`;
  ctx.fillText(metaText, isArabic ? CARD_WIDTH - padX : padX, currY);
  ctx.restore();

  // Bottom section: Divider, Event Details, Footer
  const dividerY = Math.max(currY + 70, 720);
  ctx.save();
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, dividerY);
  ctx.lineTo(CARD_WIDTH - padX, dividerY);
  ctx.stroke();
  ctx.restore();

  // Event details
  let eventY = dividerY + 44;
  const eventDate = formatEventDate(conferenceWindow);
  const eventTime = formatEventTimeRange(conferenceWindow);

  if (eventDate) {
    ctx.save();
    ctx.fillStyle = CARD_COLORS.ink;
    ctx.font = '600 36px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventDate, padX, eventY);
    ctx.restore();
    eventY += 52;
  }

  if (eventTime) {
    ctx.save();
    ctx.fillStyle = CARD_COLORS.muted;
    ctx.font = '400 28px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventTime, padX, eventY);
    ctx.restore();
    eventY += 42;
  }

  ctx.save();
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '400 28px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(CARD_LABELS.venue, padX, eventY);
  ctx.restore();

  // Footer divider
  const footerLineY = 1210;
  ctx.save();
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, footerLineY);
  ctx.lineTo(CARD_WIDTH - padX, footerLineY);
  ctx.stroke();
  ctx.restore();

  // Tagline and Host
  const footerY = footerLineY + 36;
  ctx.save();
  ctx.fillStyle = CARD_COLORS.ink;
  ctx.font = 'italic 400 30px "Source Serif 4", Georgia, serif';
  ctx.textBaseline = "top";
  ctx.fillText(SITE_TAGLINE, padX, footerY);

  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '600 22px "Public Sans", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText(SITE_HOST, CARD_WIDTH - padX, footerY + 4);
  ctx.restore();

  // 4. Export as Blob and Share/Download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed"));
        return;
      }

      // Check if navigator.canShare with files is supported
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        typeof File !== "undefined"
      ) {
        try {
          const file = new File([blob], CARD_LABELS.exportFilename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "COMPASS Attendee Card",
              text: `Registered for COMPASS: ${attendee.fullName}`,
            });
            resolve();
            return;
          }
        } catch (err: unknown) {
          if ((err as Error)?.name === "AbortError") {
            resolve();
            return;
          }
        }
      }

      // Fallback: Client-side download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = CARD_LABELS.exportFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}
