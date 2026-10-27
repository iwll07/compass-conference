# COMPASS 2026 Conference Website

## Overview
Official website for COMPASS ("Conference of Medical Practice and Scientific Studies"), a student-led, one-day medical conference at the Faculty of Medicine, Beni Suef National University (BSNU), Egypt.
- **Event Date:** 24 November 2026, 09:00–17:00 Africa/Cairo time (`lib/event.ts` is the source of truth).
- **Live Domain:** https://compassbsnu.page (retired `compass.bsnu.workers.dev` redirects via `public/theme-init.js`).
- **Built By:** Mood Digital. (Note: BMSA is NOT involved in organizing COMPASS).

## Tech Stack & Architecture
- **Framework:** Next.js static export (`output: 'export'`, `trailingSlash: true`), deployed as Cloudflare Workers static assets.
- **Backend/Auth:** Supabase (magic-link auth for `/admin` announcements; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are build-time variables).
- **Build & Security:** Build command MUST stay `npm run build` (`next build && node scripts/csp-hashes.mjs`) to write inline script SHA-256 hashes into `out/_headers`. Strict CSP and security headers live in `public/_headers`.
- **State & Docs:** Read `working.md` at the repo root for full architecture decisions and current status, and update it with every change.

## Strict Design & UX Rules
- **Aesthetic:** Restrained, editorial style. Navy and teal palette with serif headings. Dedicated dark-mode palette (never inverted).
- **No "AI-Look":** Strictly avoid pill/badge chips, generic SaaS templates, glow effects, or decorative clutter.
- **Motion:** Subtle scroll-reveal; vertical hover-lift on buttons and logos only (no hover box-shadow on logos/icons); animated underline on text links (never combine hover-lift and underline on one element). Respect `prefers-reduced-motion`.
- **Product Truth:** Empty sections must show honest "coming soon" states rather than fake placeholder content. Mobile-first responsiveness (shared via WhatsApp/Instagram).
- **Verification:** Always run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` and verify exit codes. Do not push to `origin/master` without user review on a local preview first.
