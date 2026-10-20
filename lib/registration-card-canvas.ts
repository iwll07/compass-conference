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
 *
 * Commit (a) - Proportions:
 * - Scaled up ~2.9x matching the on-page card
 * - Logo ~375px wide, name 104px serif, details 40px+
 * - 3 zones: header (logo + pulse), middle (badge + name + subline), bottom (divider + event details + footer)
 * - Clean edges (grey border removed)
 * - Leftover space distributed so no gap between blocks exceeds ~160px
 */
export async function exportCardAsImage(attendee: AttendeeCanvasData): Promise<void> {
  // 1. Wait for site webfonts to ensure crisp rendering
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await Promise.allSettled([
        document.fonts.load("400 104px 'Source Serif 4'"),
        document.fonts.load("italic 400 32px 'Source Serif 4'"),
        document.fonts.load("600 44px 'Public Sans'"),
        document.fonts.load("400 40px 'Public Sans'"),
        document.fonts.load("400 36px 'Public Sans'"),
        document.fonts.load("400 34px 'Public Sans'"),
        document.fonts.load("700 26px 'Public Sans'"),
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

  // Background (white card, clean borderless edges)
  ctx.fillStyle = CARD_COLORS.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const padX = 80;
  const contentWidth = CARD_WIDTH - padX * 2; // 920px

  // ==========================================
  // Zone 1: Header (Logo + ECG Pulse Line)
  // ==========================================
  const headerTopY = 80;
  const logoW = 375;
  const logoH = (logoW * 192) / 1100; // ~65.45px
  if (logoImg) {
    ctx.drawImage(logoImg, padX, headerTopY, logoW, logoH);
  }

  // Scaled ECG pulse line on the right, vertically centered with the logo
  const pulseW = 230;
  const pulseX = CARD_WIDTH - padX - pulseW;
  const pulseCenterY = headerTopY + logoH / 2;
  ctx.save();
  ctx.strokeStyle = CARD_COLORS.accent;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const sx = (px: number) => pulseX + (px / 160) * pulseW;
  const sy = (py: number) => pulseCenterY + ((py - 10) / 10) * 22;
  ctx.moveTo(sx(0), sy(10));
  ctx.lineTo(sx(45), sy(10));
  ctx.lineTo(sx(52), sy(10));
  ctx.lineTo(sx(56), sy(3));
  ctx.lineTo(sx(62), sy(17));
  ctx.lineTo(sx(67), sy(6));
  ctx.lineTo(sx(72), sy(14));
  ctx.lineTo(sx(76), sy(10));
  ctx.lineTo(sx(160), sy(10));
  ctx.stroke();
  ctx.restore();

  const headerBottomY = headerTopY + logoH;

  // ==========================================
  // Pre-measure Middle Zone Content
  // ==========================================
  const isArabic = /[\u0600-\u06FF]/.test(attendee.fullName);

  // Wrap registrant name up to 3 lines
  ctx.save();
  ctx.font = '400 104px "Source Serif 4", Georgia, serif';
  const nameWords = attendee.fullName.trim().split(/\s+/);
  const nameLines: string[] = [];
  let curLine = "";
  for (const word of nameWords) {
    const testLine = curLine ? `${curLine} ${word}` : word;
    if (ctx.measureText(testLine).width > contentWidth && curLine) {
      nameLines.push(curLine);
      curLine = word;
      if (nameLines.length === 2) break; // at most 3 lines
    } else {
      curLine = testLine;
    }
  }
  if (curLine) nameLines.push(curLine);
  ctx.restore();

  // Subline: {Academic year} · {University}
  const displayUniversity =
    attendee.university === "Other" && attendee.universityOther?.trim()
      ? attendee.universityOther.trim()
      : attendee.university;
  const metaText = `${attendee.academicYear} · ${displayUniversity}`;

  ctx.save();
  ctx.font = '400 40px "Public Sans", sans-serif';
  const metaWords = metaText.split(/\s+/);
  const metaLines: string[] = [];
  let curMeta = "";
  for (const word of metaWords) {
    const testMeta = curMeta ? `${curMeta} ${word}` : word;
    if (ctx.measureText(testMeta).width > contentWidth && curMeta) {
      metaLines.push(curMeta);
      curMeta = word;
    } else {
      curMeta = testMeta;
    }
  }
  if (curMeta) metaLines.push(curMeta);
  ctx.restore();

  const badgeH = 32;
  const badgeToNameGap = 20;
  const nameLineH = 118;
  const nameTotalH = nameLines.length * nameLineH;
  const nameToMetaGap = 22;
  const metaLineH = 50;
  const metaTotalH = metaLines.length * metaLineH;

  const middleTotalH =
    badgeH + badgeToNameGap + nameTotalH + nameToMetaGap + metaTotalH;

  // ==========================================
  // Pre-measure Bottom Zone Content
  // ==========================================
  const eventDate = formatEventDate(conferenceWindow);
  const eventTime = formatEventTimeRange(conferenceWindow);

  // Layout heights in bottom zone
  const dateLineH = eventDate ? 52 : 0;
  const timeLineH = eventTime ? 44 : 0;
  const venueLineH = 42;
  const eventDetailsH = dateLineH + timeLineH + venueLineH;
  const footerH = 68; // divider + tagline/host
  const bottomTotalH = 36 + eventDetailsH + 40 + footerH; // top gap + events + divider gap + footer

  // ==========================================
  // Space Distribution (no gap much more than ~160px)
  // ==========================================
  const footerBaselineY = 1270;
  const availableBetweenZones =
    footerBaselineY - headerBottomY - middleTotalH - bottomTotalH;

  // Two primary gaps: header-to-middle and middle-to-bottom
  const rawGap = availableBetweenZones / 2;
  const gapBetweenZones = Math.max(80, Math.min(rawGap, 160));

  // Position Middle Zone
  let middleY = headerBottomY + gapBetweenZones;

  // Draw "REGISTERED" Badge
  ctx.save();
  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = '700 26px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0.18em";
  }
  ctx.direction = isArabic ? "rtl" : "ltr";
  ctx.textAlign = isArabic ? "right" : "left";
  ctx.fillText(CARD_LABELS.badge, isArabic ? CARD_WIDTH - padX : padX, middleY);
  ctx.restore();

  middleY += badgeH + badgeToNameGap;

  // Draw Registrant Name (104px serif, up to 3 lines, RTL-aware)
  ctx.save();
  ctx.fillStyle = CARD_COLORS.ink;
  ctx.font = '400 104px "Source Serif 4", Georgia, serif';
  ctx.textBaseline = "top";
  ctx.direction = isArabic ? "rtl" : "ltr";
  ctx.textAlign = isArabic ? "right" : "left";
  const nameAnchorX = isArabic ? CARD_WIDTH - padX : padX;

  for (const line of nameLines) {
    ctx.fillText(line, nameAnchorX, middleY);
    middleY += nameLineH;
  }
  ctx.restore();

  middleY += nameToMetaGap;

  // Draw Subheading ({Academic year} · {University}, 40px, wrapped)
  ctx.save();
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '400 40px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  ctx.direction = isArabic ? "rtl" : "ltr";
  ctx.textAlign = isArabic ? "right" : "left";

  for (const mline of metaLines) {
    ctx.fillText(mline, isArabic ? CARD_WIDTH - padX : padX, middleY);
    middleY += metaLineH;
  }
  ctx.restore();

  // ==========================================
  // Zone 3: Bottom (Divider, Event Details, Footer)
  // ==========================================
  const bottomDividerY = middleY + gapBetweenZones;

  ctx.save();
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, bottomDividerY);
  ctx.lineTo(CARD_WIDTH - padX, bottomDividerY);
  ctx.stroke();
  ctx.restore();

  let eventY = bottomDividerY + 36;

  if (eventDate) {
    ctx.save();
    ctx.fillStyle = CARD_COLORS.ink;
    ctx.font = '600 44px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventDate, padX, eventY);
    ctx.restore();
    eventY += dateLineH;
  }

  if (eventTime) {
    ctx.save();
    ctx.fillStyle = CARD_COLORS.muted;
    ctx.font = '400 36px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventTime, padX, eventY);
    ctx.restore();
    eventY += timeLineH;
  }

  ctx.save();
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '400 34px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(CARD_LABELS.venue, padX, eventY);
  ctx.restore();
  eventY += venueLineH;

  // Footer Divider & Tagline / Host
  const footerLineY = footerBaselineY - 50;
  ctx.save();
  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, footerLineY);
  ctx.lineTo(CARD_WIDTH - padX, footerLineY);
  ctx.stroke();
  ctx.restore();

  const footerY = footerLineY + 28;
  ctx.save();
  ctx.fillStyle = CARD_COLORS.ink;
  ctx.font = 'italic 400 32px "Source Serif 4", Georgia, serif';
  ctx.textBaseline = "top";
  ctx.fillText(SITE_TAGLINE, padX, footerY);

  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = '600 24px "Public Sans", sans-serif';
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
          const file = new File([blob], CARD_LABELS.exportFilename, {
            type: "image/png",
          });
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
