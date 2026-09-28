// Postbuild: inject SHA-256 hashes of every inline <script> block found in the
// static export into the Content-Security-Policy, so script-src stays strict
// (no 'unsafe-inline') without breaking Next.js hydration.
//
// Why this exists: Next.js App Router static export always inlines executable
// React Flight payloads (`self.__next_f.push(...)`) into every HTML page.
// Those blocks differ per page but a hash allowlist is additive-safe, so we
// emit ONE global rule carrying the union of all hashes: a hash only permits
// that exact script body, wherever it appears.
//
// Source of truth for the policy text is public/_headers (human-editable).
// This script copies it to out/_headers with the computed hashes appended to
// script-src. It runs automatically via `npm run build` (chained), so every
// deploy regenerates hashes — never hand-edit out/_headers.
//
// If Cloudflare ever rejects the single long line, the fallback is per-path
// sections (each page only needs its own 2-3 hashes).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEMPLATE = join(ROOT, "public", "_headers");
const OUTPUT = join(ROOT, "out", "_headers");

function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) found.push(full);
  }
  return found;
}

const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

const hashes = new Set();
let pages = 0;
let blocks = 0;
for (const file of htmlFiles(join(ROOT, "out"))) {
  pages++;
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(inlineScript)) {
    const body = match[1];
    if (!body.trim()) continue;
    blocks++;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
}

if (hashes.size === 0) {
  console.warn("csp-hashes: no inline scripts found — emitting policy without hashes");
}

let template = readFileSync(TEMPLATE, "utf8");

// Match the script-src DIRECTIVE rather than an exact literal string. The
// directive now also carries the Cloudflare beacon host, so a literal
// "script-src 'self';" marker no longer exists and would throw. Capturing the
// directive up to its terminating ';' lets us splice the hashes in while
// preserving any other sources already listed (e.g. the analytics beacon).
// The loud failure below is deliberate: if script-src is ever renamed or
// dropped, a silently unhashed build would break hydration in production, so
// this must keep failing loudly rather than degrade.
const SCRIPT_SRC = /(script-src\s+)([^;]*)(;)/;
if (!SCRIPT_SRC.test(template)) {
  throw new Error(`csp-hashes: no "script-src" directive found in public/_headers — cannot inject inline script hashes`);
}
const sorted = [...hashes].sort().join(" ");
template = template.replace(SCRIPT_SRC, (_match, directive, sources, terminator) => {
  const existing = sources.trim();
  // Hashes go after existing sources so the human-authored allowlist stays
  // readable at the front of the directive.
  return `${directive}${existing}${existing ? " " : ""}${sorted}${terminator}`;
});

writeFileSync(OUTPUT, template);
console.log(`csp-hashes: ${blocks} inline blocks, ${hashes.size} unique hashes across ${pages} pages -> out/_headers`);
