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

interface CardColors {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  accentSoft: string;
}

/**
 * Reads colours directly from the on-page .reg-card computed custom properties
 * to guarantee that the canvas export cannot drift from the rendered card.
 * Falls back to CARD_COLORS constants if DOM is not ready.
 */
function getCardColors(): CardColors {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const cardEl = document.querySelector(".reg-card");
    if (cardEl) {
      const style = window.getComputedStyle(cardEl);
      const bg = style.getPropertyValue("--card-bg").trim();
      const ink = style.getPropertyValue("--card-ink").trim();
      const muted = style.getPropertyValue("--card-muted").trim();
      const accent = style.getPropertyValue("--card-accent").trim();
      const line = style.getPropertyValue("--card-line").trim();
      const accentSoft = style.getPropertyValue("--card-accent-soft").trim();
      return {
        bg: bg || CARD_COLORS.bg,
        ink: ink || CARD_COLORS.ink,
        muted: muted || CARD_COLORS.muted,
        accent: accent || CARD_COLORS.accent,
        line: line || CARD_COLORS.line,
        accentSoft: accentSoft || CARD_COLORS.accentSoft,
      };
    }
  }
  return CARD_COLORS;
}

/**
 * Draws the attendee card to an off-screen HTML5 Canvas and exports or shares it.
 * Zero external dependencies — uses only the browser's native 2D Canvas context.
 *
 * Commit (b) - Polish:
 * - Scaled up ~2.9x matching on-page card proportions
 * - Thin gradient strip (navy to teal) along the very top
 * - Full-width navy footer band (~170px) holding tagline in white serif italic and host in white
 * - Colours read dynamically from .reg-card computed custom properties (no new colours)
 * - Three-zone layout with distributed leftover space (no gap much more than ~160px)
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

  const colors = getCardColors();

  // Background (white card, clean borderless edges)
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Top thin gradient strip (navy to teal, matching logo and on-page card ::before)
  const topStripH = 12;
  const topGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
  topGrad.addColorStop(0, colors.ink);
  topGrad.addColorStop(1, colors.accent);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, topStripH);

  // Full-width navy footer band (170px) at the very bottom
  const footerBandH = 170;
  const footerBandY = CARD_HEIGHT - footerBandH; // 1180px
  ctx.fillStyle = colors.ink;
  ctx.fillRect(0, footerBandY, CARD_WIDTH, footerBandH);

  const padX = 80;
  const contentWidth = CARD_WIDTH - padX * 2; // 920px

  // ==========================================
  // Zone 1: Header (Logo + ECG Pulse Line)
  // ==========================================
  const headerTopY = 88;
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
  ctx.strokeStyle = colors.accent;
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
  // Pre-measure Bottom Zone (Event details)
  // ==========================================
  const eventDate = formatEventDate(conferenceWindow);
  const eventTime = formatEventTimeRange(conferenceWindow);

  const dateLineH = eventDate ? 52 : 0;
  const timeLineH = eventTime ? 44 : 0;
  const venueLineH = 42;
  const eventDetailsContentH = 36 + dateLineH + timeLineH + venueLineH;

  // ==========================================
  // Space Distribution (Header -> Middle -> Event Details -> Footer Band)
  // ==========================================
  const totalVerticalSpan = footerBandY - headerBottomY;
  const totalContentH = middleTotalH + eventDetailsContentH;
  const availableForThreeGaps = totalVerticalSpan - totalContentH;

  // Distribute across the 3 gaps, keeping each around ~120-160px
  const baseGap = availableForThreeGaps / 3;
  const gapBetweenBlocks = Math.max(70, Math.min(baseGap, 160));

  // Position Middle Zone
  let middleY = headerBottomY + gapBetweenBlocks;

  // Draw "REGISTERED" Badge
  ctx.save();
  ctx.fillStyle = colors.accent;
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
  ctx.fillStyle = colors.ink;
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
  ctx.fillStyle = colors.muted;
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
  // Zone 3: Bottom (Divider, Event Details)
  // ==========================================
  const bottomDividerY = middleY + gapBetweenBlocks;

  ctx.save();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, bottomDividerY);
  ctx.lineTo(CARD_WIDTH - padX, bottomDividerY);
  ctx.stroke();
  ctx.restore();

  let eventY = bottomDividerY + 36;

  if (eventDate) {
    ctx.save();
    ctx.fillStyle = colors.ink;
    ctx.font = '600 44px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventDate, padX, eventY);
    ctx.restore();
    eventY += dateLineH;
  }

  if (eventTime) {
    ctx.save();
    ctx.fillStyle = colors.muted;
    ctx.font = '400 36px "Public Sans", sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(eventTime, padX, eventY);
    ctx.restore();
    eventY += timeLineH;
  }

  ctx.save();
  ctx.fillStyle = colors.muted;
  ctx.font = '400 34px "Public Sans", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(CARD_LABELS.venue, padX, eventY);
  ctx.restore();

  // ==========================================
  // Zone 4: Full-width Navy Footer Band (170px)
  // Tagline in white serif italic, Host in white on right
  // ==========================================
  const footerTextCenterY = footerBandY + footerBandH / 2;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";

  ctx.font = 'italic 400 32px "Source Serif 4", Georgia, serif';
  ctx.textAlign = "left";
  ctx.fillText(SITE_TAGLINE, padX, footerTextCenterY);

  ctx.font = '600 24px "Public Sans", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText(SITE_HOST, CARD_WIDTH - padX, footerTextCenterY);
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
