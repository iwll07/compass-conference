import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.join(process.cwd(), 'assets-src/people');
const OUT_DIR = path.join(process.cwd(), 'public/people');
const CONFIG_FILE = path.join(process.cwd(), 'scripts/people-config.json');

// Defringe semi-transparent edge pixels that have white matte background remnants
function defringe(buffer) {
  const out = Buffer.from(buffer);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a > 0 && a < 252) {
      const alpha = a / 255;
      // Un-multiply assumed white background: (observed - 255*(1-alpha)) / alpha
      for (let c = 0; c < 3; c++) {
        const obs = out[i + c];
        const unmixed = (obs - 255 * (1 - alpha)) / alpha;
        out[i + c] = Math.max(0, Math.min(255, Math.round(unmixed)));
      }
    }
  }
  return out;
}

// Helper to crop an exact target window with transparent padding if needed
async function cropWindow(imageInstance, targetW, targetH, cropLeft, cropTop) {
  const meta = await imageInstance.metadata();
  const cLeft = Math.round(cropLeft);
  const cTop = Math.round(cropTop);

  const padLeft = Math.max(0, -cLeft);
  const padTop = Math.max(0, -cTop);
  const padRight = Math.max(0, (cLeft + targetW) - meta.width);
  const padBottom = Math.max(0, (cTop + targetH) - meta.height);

  let processed = imageInstance;
  if (padLeft > 0 || padTop > 0 || padRight > 0 || padBottom > 0) {
    const extendedBuf = await processed.extend({
      left: padLeft,
      top: padTop,
      right: padRight,
      bottom: padBottom,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }).png().toBuffer();
    processed = sharp(extendedBuf);
  }

  const finalX = cLeft + padLeft;
  const finalY = cTop + padTop;

  return processed.extract({
    left: finalX,
    top: finalY,
    width: targetW,
    height: targetH
  });
}

// Measured landmarks from raw 480x480 source
const rawPeople = [
  { id: 'tarek-ali', file: 'tarek-ali.png', headTop: 100, eyes: 165, chin: 216, centerX: 240 },
  { id: 'rasha-tawfik', file: 'rasha-tawfik.png', headTop: 77, eyes: 153, chin: 205, centerX: 228 },
  { id: 'ahmed-osama', file: 'ahmed-osama.png', headTop: 39, eyes: 156, chin: 236, centerX: 235 },
  { id: 'doaa-hamdy', file: 'doaa-hamdy.png', headTop: 24, eyes: 140, chin: 215, centerX: 246 },
  { id: 'sherine-ghaleb', file: 'sherine-ghaleb.png', headTop: 16, eyes: 155, chin: 242, centerX: 254 },
  { id: 'osama-abdelhay', file: 'osama-abdelhay.png', headTop: 52, eyes: 158, chin: 235, centerX: 262 },
  { id: 'emad-el-banna', file: 'emad-el-banna.png', headTop: 162, eyes: 235, chin: 290, centerX: 245 },
];

export async function processPeople() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Load config if present
  let config = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      config = {};
    }
  }

  /*
    Target Card Specifications:
    Canvas: 560 x 720
    Target Headroom: 11.8% (85px)
    Target Head Height: 312px (headTop to chin)
    Target Eye Line: ~215px (30% of canvas)
    Target Chin: ~397px
    Target Center: 280px
  */
  const CARD_WIDTH = 560;
  const CARD_HEIGHT = 720;
  const TARGET_CARD_HEAD_H = 312;
  const TARGET_CARD_HEAD_TOP = 85;

  /*
    Target Thumb Specifications:
    Canvas: 144 x 144
    Head fills 65% of circle (head height ~94px)
    Head Top: 10px
    Chin: 104px
    Eye line: ~60px
    Target Center: 72px
  */
  const THUMB_WIDTH = 144;
  const THUMB_HEIGHT = 144;
  const TARGET_THUMB_HEAD_H = 94;
  const TARGET_THUMB_HEAD_TOP = 10;

  const cardResults = [];
  const thumbResults = [];

  for (const person of rawPeople) {
    const srcPath = path.join(SRC_DIR, person.file);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing source file: ${srcPath}`);
    }

    const { data: rawData, info: rawInfo } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
    const defringedData = defringe(rawData);
    const defringedPng = await sharp(defringedData, {
      raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 }
    }).png().toBuffer();

    const headH = person.chin - person.headTop;
    const personConfig = config[person.id] || {};

    // --- CARD VARIANT ---
    const cardScale = personConfig.cardScale || (TARGET_CARD_HEAD_H / headH);
    const cardScaledW = Math.round(rawInfo.width * cardScale);
    const cardScaledH = Math.round(rawInfo.height * cardScale);

    const cardCropLeft = personConfig.cardCropLeft !== undefined
      ? personConfig.cardCropLeft
      : Math.round(person.centerX * cardScale - CARD_WIDTH / 2);

    const cardCropTop = personConfig.cardCropTop !== undefined
      ? personConfig.cardCropTop
      : Math.round(person.headTop * cardScale - TARGET_CARD_HEAD_TOP);

    // Scale defringed PNG
    const scaledCardPng = await sharp(defringedPng).resize(cardScaledW, cardScaledH).png().toBuffer();
    const scaledCardImage = sharp(scaledCardPng);
    const croppedCard = await cropWindow(scaledCardImage, CARD_WIDTH, CARD_HEIGHT, cardCropLeft, cardCropTop);

    const cardBuffer = await croppedCard
      .webp({ quality: 86, alphaQuality: 92, effort: 6 })
      .toBuffer();

    const cardOutPath = path.join(OUT_DIR, `${person.id}-card.webp`);
    fs.writeFileSync(cardOutPath, cardBuffer);

    // Compute actual landmarks in card canvas
    const actualCardTop = Math.round(person.headTop * cardScale - cardCropTop);
    const actualCardEyes = Math.round(person.eyes * cardScale - cardCropTop);
    const actualCardChin = Math.round(person.chin * cardScale - cardCropTop);
    const actualCardHeadH = actualCardChin - actualCardTop;

    cardResults.push({
      id: person.id,
      path: cardOutPath,
      size: cardBuffer.length,
      headTop: actualCardTop,
      eyes: actualCardEyes,
      chin: actualCardChin,
      headH: actualCardHeadH
    });

    // --- THUMB VARIANT ---
    const thumbScale = personConfig.thumbScale || (TARGET_THUMB_HEAD_H / headH);
    const thumbScaledW = Math.round(rawInfo.width * thumbScale);
    const thumbScaledH = Math.round(rawInfo.height * thumbScale);

    const thumbCropLeft = personConfig.thumbCropLeft !== undefined
      ? personConfig.thumbCropLeft
      : Math.round(person.centerX * thumbScale - THUMB_WIDTH / 2);

    const thumbCropTop = personConfig.thumbCropTop !== undefined
      ? personConfig.thumbCropTop
      : Math.round(person.headTop * thumbScale - TARGET_THUMB_HEAD_TOP);

    const scaledThumbPng = await sharp(defringedPng).resize(thumbScaledW, thumbScaledH).png().toBuffer();
    const scaledThumbImage = sharp(scaledThumbPng);
    const croppedThumb = await cropWindow(scaledThumbImage, THUMB_WIDTH, THUMB_HEIGHT, thumbCropLeft, thumbCropTop);

    const thumbBuffer = await croppedThumb
      .webp({ quality: 84, alphaQuality: 90, effort: 6 })
      .toBuffer();

    const thumbOutPath = path.join(OUT_DIR, `${person.id}-thumb.webp`);
    fs.writeFileSync(thumbOutPath, thumbBuffer);

    const actualThumbTop = Math.round(person.headTop * thumbScale - thumbCropTop);
    const actualThumbEyes = Math.round(person.eyes * thumbScale - thumbCropTop);
    const actualThumbChin = Math.round(person.chin * thumbScale - thumbCropTop);
    const actualThumbHeadH = actualThumbChin - actualThumbTop;

    thumbResults.push({
      id: person.id,
      path: thumbOutPath,
      size: thumbBuffer.length,
      headTop: actualThumbTop,
      eyes: actualThumbEyes,
      chin: actualThumbChin,
      headH: actualThumbHeadH
    });

    config[person.id] = {
      cardScale,
      cardCropLeft,
      cardCropTop,
      thumbScale,
      thumbCropLeft,
      thumbCropTop
    };
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  // --- CALIBRATION SHEETS ---
  const ARTIFACT_DIR = 'C:/Users/fares/.gemini/antigravity/brain/8a930f24-decb-48f1-ae9c-8d53d5d2a297';

  // 1. Card Calibration Sheet
  const cardSheetW = CARD_WIDTH * rawPeople.length;
  const cardSheetInputs = [];
  for (let i = 0; i < rawPeople.length; i++) {
    cardSheetInputs.push({
      input: path.join(OUT_DIR, `${rawPeople[i].id}-card.webp`),
      left: i * CARD_WIDTH,
      top: 0
    });
  }

  const meanCardTop = Math.round(cardResults.reduce((acc, c) => acc + c.headTop, 0) / cardResults.length);
  const meanCardEyes = Math.round(cardResults.reduce((acc, c) => acc + c.eyes, 0) / cardResults.length);
  const meanCardChin = Math.round(cardResults.reduce((acc, c) => acc + c.chin, 0) / cardResults.length);

  const cardSvg = `
    <svg width="${cardSheetW}" height="${CARD_HEIGHT}">
      <!-- Divider vertical lines between persons -->
      ${rawPeople.map((_, i) => `<line x1="${i * CARD_WIDTH}" y1="0" x2="${i * CARD_WIDTH}" y2="${CARD_HEIGHT}" stroke="rgba(0,0,0,0.1)" stroke-width="1" />`).join('')}
      <!-- Head Top Guide Line -->
      <line x1="0" y1="${meanCardTop}" x2="${cardSheetW}" y2="${meanCardTop}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8 4" />
      <text x="20" y="${meanCardTop - 8}" fill="#ef4444" font-family="sans-serif" font-size="16" font-weight="bold">HEAD TOP (${meanCardTop}px)</text>
      
      <!-- Eye Line Guide Line -->
      <line x1="0" y1="${meanCardEyes}" x2="${cardSheetW}" y2="${meanCardEyes}" stroke="#06b6d4" stroke-width="2" stroke-dasharray="8 4" />
      <text x="20" y="${meanCardEyes - 8}" fill="#06b6d4" font-family="sans-serif" font-size="16" font-weight="bold">EYE LINE (${meanCardEyes}px)</text>
      
      <!-- Chin Guide Line -->
      <line x1="0" y1="${meanCardChin}" x2="${cardSheetW}" y2="${meanCardChin}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8 4" />
      <text x="20" y="${meanCardChin - 8}" fill="#f59e0b" font-family="sans-serif" font-size="16" font-weight="bold">CHIN (${meanCardChin}px)</text>

      <!-- Bottom Baseline -->
      <line x1="0" y1="${CARD_HEIGHT - 2}" x2="${cardSheetW}" y2="${CARD_HEIGHT - 2}" stroke="#10b981" stroke-width="4" />
      <text x="20" y="${CARD_HEIGHT - 12}" fill="#10b981" font-family="sans-serif" font-size="16" font-weight="bold">BASELINE (${CARD_HEIGHT}px)</text>
    </svg>
  `;

  cardSheetInputs.push({ input: Buffer.from(cardSvg), left: 0, top: 0 });

  const cardSheetCanvas = sharp({
    create: {
      width: cardSheetW,
      height: CARD_HEIGHT,
      channels: 4,
      background: { r: 245, g: 247, b: 244, alpha: 1 }
    }
  });

  await cardSheetCanvas.composite(cardSheetInputs).png().toFile(path.join(ARTIFACT_DIR, 'calibration-card.png'));
  console.log('Saved calibration-card.png');

  // 2. Thumb Calibration Sheet
  const thumbSheetW = THUMB_WIDTH * rawPeople.length;
  const thumbSheetInputs = [];
  for (let i = 0; i < rawPeople.length; i++) {
    thumbSheetInputs.push({
      input: path.join(OUT_DIR, `${rawPeople[i].id}-thumb.webp`),
      left: i * THUMB_WIDTH,
      top: 0
    });
  }

  const meanThumbTop = Math.round(thumbResults.reduce((acc, t) => acc + t.headTop, 0) / thumbResults.length);
  const meanThumbEyes = Math.round(thumbResults.reduce((acc, t) => acc + t.eyes, 0) / thumbResults.length);
  const meanThumbChin = Math.round(thumbResults.reduce((acc, t) => acc + t.chin, 0) / thumbResults.length);

  const thumbSvg = `
    <svg width="${thumbSheetW}" height="${THUMB_HEIGHT}">
      <!-- Divider vertical lines between persons -->
      ${rawPeople.map((_, i) => `<line x1="${i * THUMB_WIDTH}" y1="0" x2="${i * THUMB_WIDTH}" y2="${THUMB_HEIGHT}" stroke="rgba(0,0,0,0.1)" stroke-width="1" />`).join('')}
      <line x1="0" y1="${meanThumbTop}" x2="${thumbSheetW}" y2="${meanThumbTop}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2" />
      <text x="8" y="${meanThumbTop - 2}" fill="#ef4444" font-family="sans-serif" font-size="10" font-weight="bold">TOP (${meanThumbTop}px)</text>
      
      <line x1="0" y1="${meanThumbEyes}" x2="${thumbSheetW}" y2="${meanThumbEyes}" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4 2" />
      <text x="8" y="${meanThumbEyes - 2}" fill="#06b6d4" font-family="sans-serif" font-size="10" font-weight="bold">EYES (${meanThumbEyes}px)</text>
      
      <line x1="0" y1="${meanThumbChin}" x2="${thumbSheetW}" y2="${meanThumbChin}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 2" />
      <text x="8" y="${meanThumbChin - 2}" fill="#f59e0b" font-family="sans-serif" font-size="10" font-weight="bold">CHIN (${meanThumbChin}px)</text>

      <line x1="0" y1="${THUMB_HEIGHT - 1}" x2="${thumbSheetW}" y2="${THUMB_HEIGHT - 1}" stroke="#10b981" stroke-width="2" />
    </svg>
  `;

  thumbSheetInputs.push({ input: Buffer.from(thumbSvg), left: 0, top: 0 });

  const thumbSheetCanvas = sharp({
    create: {
      width: thumbSheetW,
      height: THUMB_HEIGHT,
      channels: 4,
      background: { r: 245, g: 247, b: 244, alpha: 1 }
    }
  });

  await thumbSheetCanvas.composite(thumbSheetInputs).png().toFile(path.join(ARTIFACT_DIR, 'calibration-thumb.png'));
  console.log('Saved calibration-thumb.png');

  // Print Summary Table
  console.log('\n=== CARD VARIANTS (target: 560x720, < 70KB) ===');
  for (const c of cardResults) {
    console.log(`${c.id}: ${(c.size / 1024).toFixed(1)} KB | top=${c.headTop}px, eyes=${c.eyes}px, chin=${c.chin}px, headH=${c.headH}px`);
  }
  const minCardH = Math.min(...cardResults.map(c => c.headH));
  const maxCardH = Math.max(...cardResults.map(c => c.headH));
  const cardHSpread = (((maxCardH - minCardH) / TARGET_CARD_HEAD_H) * 100).toFixed(2);
  const minCardEyes = Math.min(...cardResults.map(c => c.eyes));
  const maxCardEyes = Math.max(...cardResults.map(c => c.eyes));
  const cardEyeSpread = (((maxCardEyes - minCardEyes) / CARD_HEIGHT) * 100).toFixed(2);
  console.log(`Card Head Size Spread: ${cardHSpread}% (budget: <= 6%)`);
  console.log(`Card Eye Line Spread: ${cardEyeSpread}% (budget: <= 4%)`);

  console.log('\n=== THUMB VARIANTS (target: 144x144, < 12KB) ===');
  for (const t of thumbResults) {
    console.log(`${t.id}: ${(t.size / 1024).toFixed(1)} KB | top=${t.headTop}px, eyes=${t.eyes}px, chin=${t.chin}px, headH=${t.headH}px (${((t.headH / THUMB_HEIGHT) * 100).toFixed(1)}%)`);
  }
}

processPeople().catch(err => {
  console.error(err);
  process.exit(1);
});
