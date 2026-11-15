// Builds the square cutouts used by the vote page.
//
// Source images live in `public/Student presenters png/` and ship at their
// original size (130–275 KB, all transparent PNGs). This script trims the
// transparent border, crops to head + upper body, scales into a 448px box
// anchored to the bottom of the stage, adds 16px of padding, and writes a
// palette PNG at 480x480 under `public/voting/`.
//
// Usage: npm run process:voting
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "public", "Student presenters png");
const OUT_DIR = path.join(process.cwd(), "public", "voting");

const CANVAS = 480;
const PADDING = 16;
const INNER = CANVAS - PADDING * 2;

// The AI talk has two presenters, so it gets two cutouts. Every other talk has
// one. `out` matches the basename referenced from lib/voting-candidates.json.
const SOURCES = [
  { out: "artificial-intelligence-revolution-or-risk", file: "Lobna_Ahmed_Diab-removebg-preview.png" },
  { out: "artificial-intelligence-revolution-or-risk-co", file: "Abdelrahman_Eid_Abdelfatah-removebg-preview.png" },
  { out: "base-editing-revolution", file: "Basmala_Hassan_Mohammed-removebg-preview.png" },
  { out: "dna-origami-nanorobotics", file: "Nada_El-Sayem_Shapaan-removebg-preview.png" },
  { out: "digital-phenotyping-mental-health", file: "Malak_Ashraf_Saad_Abdelfatah-removebg-preview.png" },
  { out: "preeclampsia-statin-metformin-vitamin-d", file: "Habiba_Mohammed_Salah-removebg-preview.png" },
  { out: "organoids-miniature-organs", file: "Nada_Ashraf_Nour_El_Din-removebg-preview.png" },
];

const MAX_BYTES = 120 * 1024;

/**
 * Tall, narrow cutouts are usually full-height photos, so keep a smaller slice
 * from the top (head + chest). Wider cutouts are already waist-up, so keep
 * more of them.
 */
function upperBodyFraction(height, width) {
  const ratio = height / width;
  if (ratio > 1.8) return 0.55;
  if (ratio > 1.4) return 0.68;
  if (ratio > 1.15) return 0.8;
  return 1;
}

async function processOne({ out, file }) {
  const srcPath = path.join(SRC_DIR, file);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Missing source image: ${srcPath}`);
  }

  // 1. Drop the transparent margin so the crop is measured against the person.
  const trimmed = await sharp(srcPath).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const width = meta.width;
  const height = meta.height;

  const keep = upperBodyFraction(height, width);
  const cropHeight = Math.max(1, Math.round(height * keep));

  // 2. Crop from the top, then fit inside the padded box, anchored bottom.
  const cropped = await sharp(trimmed)
    .extract({ left: 0, top: 0, width, height: cropHeight })
    .toBuffer();

  const inner = await sharp(cropped)
    .resize({
      width: INNER,
      height: INNER,
      fit: "contain",
      position: "south",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const composed = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: inner, left: PADDING, top: PADDING }])
    .png({ compressionLevel: 9, palette: true, colours: 160 })
    .toBuffer();

  if (composed.length > MAX_BYTES) {
    throw new Error(
      `${out}.png is ${(composed.length / 1024).toFixed(0)} KB, over the ${MAX_BYTES / 1024} KB budget`
    );
  }

  const outPath = path.join(OUT_DIR, `${out}.png`);
  fs.writeFileSync(outPath, composed);
  return { out, bytes: composed.length, width, height, keep };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
for (const source of SOURCES) {
  results.push(await processOne(source));
}

for (const result of results) {
  console.log(
    `${result.out}.png  ${(result.bytes / 1024).toFixed(1)} KB  ` +
      `(source ${result.width}x${result.height}, kept ${Math.round(result.keep * 100)}%)`
  );
}
