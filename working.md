# COMPASS working log

## Current state
- Animation pass: scroll reveal + hover split + icon/nav transitions. `components/scroll-reveal.tsx` (new, mounted once in `app/layout.tsx`) observes `.reveal:not(.reveal-visible)` via IntersectionObserver (12% threshold), adds `.reveal-visible` once and never removes it; re-scans on every client navigation via usePathname. Hidden pre-reveal state is gated on `html.js` (set by the inline theme script) so no-JS users always see content; reduced-motion and print force `.reveal` fully visible (globals.css). Stagger via inline `--reveal-delay` (80ms steps) on heading areas + first sections of all 7 pages. Hover split, both 160ms cubic-bezier(.23,1,.32,1) and gated behind (hover:hover) and (pointer:fine): `.hover-lift` (-3px + `var(--shadow)`, new token in theme.css) for buttons/cards/logos — applied to `.button`, footer seal slots, Mood Digital logo link; comment on the class marks it for future Speakers/Sponsors/Posters cards. `.link-underline` (::after scaleX grow-in from left) for plain text links — desktop nav, mobile nav label spans, explore-list h3s. Hamburger + theme toggle swap icons via `.icon-swap` + `.icon-swap-alt` rotate+fade (both icons mounted, `.icon-base`/`.icon-alt`). Mobile nav now always mounted, class-toggled `.mobile-nav-open` (max-height + opacity + translateY, ~240ms; padding-bottom/border-bottom live on open state so the closed panel collapses fully); aria-expanded/controls/label, Escape-returns-focus, and link-click-close all preserved. Latent bug fixed: `usePathname()` returns trailing-slash paths ("/about/") so `aria-current` never matched link hrefs — header now normalizes before comparing. Verified: lint, typecheck, 8/8 unit, 48/48 QA, 33/33 motion assertions (`scripts/motion-check.mjs`), screenshots light/dark/mobile/nav-open (`scripts/motion-shots.mjs`).
- Footer reworked (unpushed): `.footer-bottom` row removed entirely (JSX + CSS + mobile override; unused icon import dropped); `.credit-bar` now full-bleed via breakout margins with centered 1260px `.credit-inner`; sticky-bottom footer via `body` flex column 100dvh + `main{flex:1}` (verified on short posters page and long home page); credit text corrected to "led by Founder" and "Fourth-year student". Verified 21/21 credit + 3/3 sticky + 48/48 QA across light/dark/mobile (`scripts/credit-check.mjs`, `scripts/sticky-check.mjs`).
- Mood Digital credit bar in footer: user-supplied `public/mood_digital.png` renamed to `public/mood-digital-logo.png` (487x513 white mark, 54px); new `.credit-bar` section below `.footer-bottom` with exact credit text (strongs on company + CEO), mailto email link, and logo linking to Facebook (new tab, aria-label). Styled with existing `--panel` tokens, stacked/centered on mobile. Verified 21/21 assertions across light/dark/mobile (`scripts/credit-check.mjs`); existing footer untouched.
- Favicon switched to dedicated compass mark (unpushed): user-supplied `public/tab_compass.png` renamed to `public/tab-compass.png`; `metadata.icons` (icon + apple) now points at it instead of the 1127x213 wordmark. Source is 176x193 so no resized copies generated (nothing to gain; upscaling to 180 would hurt). Header/footer keep the wordmark untouched. Verified link tags + 200 + legibility rendered at 16px/32px (`scripts/favicon-check.mjs`).
- Agenda stale-date bug fixed (unpushed): agenda page hardcoded "to be announced" while the date was set. Added `formatEventWindow()` in `lib/event.ts` (en-GB date + start-end time range + zone, `null` when unset/invalid); agenda status line and meta description both derive from one shared `eventLine` const. Session empty-state logic untouched. Verified in `out/agenda/index.html` page source (status line + meta both show the real date); typecheck + 8/8 unit tests + 48/48 QA green. Note: Oct dates render +1h in Cairo (Egypt DST) — helper is correct; test pins a November date to avoid the ambiguity.
- Real COMPASS logo wired in (unpushed): user-supplied `public/compass-logo.png` (1127x213, renamed from "Compass png logo.png") in header (180x34), footer (h30), and favicon/apple-touch-icon via metadata. Verified light desktop/mobile + footer + favicon 200. KNOWN ISSUE: navy logo nearly unreadable on dark header — user will supply a light version later (`public/compass-logo-light.png`), wire to `[data-theme="dark"]` then.
- Institution seals wired in (unpushed): user-supplied `public/bsnu-logo.png` (497x502) + `public/fms-logo.png` (503x496), rendered 54px in footer slots replacing dashed placeholders and "forthcoming" notes. Verified via screenshot (`scripts/seals-check.mjs`).
- Event-strip location links to Google Maps (unpushed): homepage `event-place` is now an external link to the user-supplied Maps URL (new tab, noopener, aria-label), same visual styling with underline on hover. Verified href/target/rel in browser (`scripts/maps-check.mjs`); 48/48 QA suite still green.
- Conference date SET (commit `02391b2`): November 20, 2026, 09:00–17:00 Africa/Cairo (+02:00), one-day event. Countdown now live on homepage. `lib/event.ts` conferenceWindow populated; typecheck + 6 unit tests pass.
- Hero redesigned (commit `4e263c2`, pushed): full-bleed `public/college.jpeg` (800x533, user-supplied), compass plate removed, text centered; scrims are tokens `--hero-scrim`/`--hero-ink`/`--hero-muted` in `app/theme.css` (light: navy 0.68, dark: near-black 0.78, deepened in `e9e07ff`). Verified with screenshots (light/dark/mobile) + 12 computed-style assertions (`scripts/hero-def-check.mjs`).
- LIVE on Cloudflare Workers (static assets): https://compass.bsnu.workers.dev/ — worker renamed to `compass` on the `bsnu` account subdomain (wrangler.jsonc name aligned; old compass-conference.iwllwill01.workers.dev no longer resolves). Full QA suite passed against production (BASE_URL env var in scripts/qa-assert.mjs).
- Deploy model: Cloudflare Workers build pipeline (not classic Pages) — build command `npm run build`, deploy command `npx wrangler deploy`, config in `wrangler.jsonc` (assets.directory=./out, not_found_handling=404-page). Verified locally via clean-clone build + `wrangler deploy --dry-run` before push.
- Code pushed to GitHub: https://github.com/iwll07/compass-conference (origin/master, tracking, in sync).
- Full verification suite green: lint, typecheck, 6 countdown unit tests, 46 browser assertions, 8-route static build.
- Git identity: iwll07 <iwllwill01@gmail.com> (repo-local). Note: Windows credential manager previously held a different GitHub account (bmsadev); resolved via `git credential-manager github login` as iwll07.
- Setup and minimal Next.js 16.3.5 App Router static-export scaffold complete.
- User approved static export instead of the deprecated adapter, and chose to WAIT for exact registration fields (no form/schema until supplied).
- Native Node remains 22.6.0; `.nvmrc` requests 22.14.0. Engine warnings remain until the actual runtime is upgraded.

## Checklist
- [x] Inspect actual git state and root (no previous working.md existed).
- [x] Run `npx skills add emilkowalski/skill`.
- [x] Run `npx skills add https://github.com/pbakaus/impeccable --skill impeccable`.
- [x] Run `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend`.
- [x] Attempt `npx plugins add supabase-community/supabase-plugin`: installer has no OpenCode target. Installed shared Supabase skills using `npx skills add supabase-community/supabase-plugin` instead. No Supabase MCP connected.
- [x] Run Playwright CLI 0.1.20 and `npx --yes @playwright/cli install --skills`; Edge detected, config created.
- [x] Context7 CLI works through `npx --yes ctx7 docs`; fetched current Next.js static export and Supabase RLS documentation. No MCP connection required for CLI usage.
- [x] Read design skill entry points; Impeccable context command succeeded.
- [x] Confirm deployment architecture: user approved current Next.js static export to Pages, without next-on-pages.
- [x] Establish brand context and direction; execute Impeccable craft/audit/polish/harden lifecycle (first pass done: editorial navy/teal system, Source Serif 4 + Public Sans, compass plate, asymmetric grids; screenshots reviewed).
- [x] Home (hero, intro, event strip, explore list, sponsor strip).
- [x] About (human committee note, placeholders for names).
- [x] Agenda with print-friendly view (print media stylesheet: nav/footer/buttons hidden, A4 layout; print button uses window.print).
- [x] Speakers/guests — intentional empty state; typed data model ready for bios+abstracts in lib/content.ts.
- [x] Posters — empty state; typed gallery model ready.
- [x] Sponsors — empty state; typed tier/blurb/link model ready.
- [x] Registration: coming-soon page ONLY (user chose WAIT for exact fields; zero form controls, verified by test).
- [x] Isolated light/dark theme: single app/theme.css token file, distinct dark palette, localStorage + system preference, no-flash inline script; removal = delete file + toggle + script.
- [x] Countdown: timezone-aware (Intl validation), live/upcoming/ended/unannounced states, 6 unit tests pass, updates without refresh, no negative values.
- [x] Desktop/mobile screenshots throughout completed units (scripts/qa.mjs + .playwright-cli/qa/).
- [x] Lint/typecheck/tests pass; 46 browser assertions pass (scripts/qa-assert.mjs); static export builds all 8 routes.
- [x] Live Workers deployment and runtime verification (against https://compass.bsnu.workers.dev/).

## Remaining (awaiting user input)
- [ ] Registration form + Supabase schema/RLS: WAITING on exact fields/payment/capacity decisions (user explicitly chose to wait).
- [ ] Real content: speakers, agenda sessions, sponsors, posters (fill typed arrays in lib/content.ts).
- [ ] Logo files: COMPASS mark, BSNU, faculty (placeholder slots in place).
- [ ] Optional: NODE_VERSION=22.14.0 env var in CF dashboard to silence engine warnings.

## Key findings and decisions pending
- Requested `@cloudflare/next-on-pages` 1.13.16 is deprecated. Its npm peer range is Next.js >=14.3.0 <=15.5.2; current Next.js reported by npm is 16.3.5. Do not silently downgrade Next.js or change the requested adapter.
- Current Cloudflare Pages docs recommend static Next.js export for Pages. Recommended proposal: current Next.js static export + Supabase backend, preserving Pages hosting and portability to Vercel, but dropping the obsolete adapter only with user approval.
- Source: https://developers.cloudflare.com/pages/framework-guides/nextjs/
- Adapter status: https://github.com/cloudflare/next-on-pages
- Native Node is v22.6.0 / npm 10.8.2. Context7 runs, but some dependencies warn they require a newer Node 22 patch. Use a supported Node version for the application tooling.
- No app lint/typecheck scripts exist yet.

## Product truth and constraints
COMPASS: Conference of Medical Practice and Scientific Studies, student-led at Faculty of Medicine and Surgery, Beni Suef National University. Tagline: Directing the Future of Healthcare.
Navy + teal logo supplied inline in chat, not as a local file. Preserve original artwork once available; do not claim a recreated mark is the supplied logo. BSNU/faculty institutional marks need clear placeholder slots until supplied.
Design: asymmetric, editorial/institutional rather than SaaS; confident serif/slab headline with grotesque body; subtle compass/pulse geometry. No purple gradients, glass backgrounds, generic rounded card grids, Inter/Poppins defaults.
Unknown dates, agenda, speakers, sponsors, posters must remain honestly unannounced. Registration details/payment/capacity/confirmation are TBD; do not invent final rules or open real registration prematurely.
Out of scope: badges, Strix testing, duplicate prevention, Arabic-name/Egyptian-phone validation, capacity/waitlist.
Registrants' personal data must not be readable with the anon key. Verify explicit grants and RLS, not defaults.

## Structure and continuity
- Site structure: `app/{page,about,agenda,speakers,posters,sponsors,registration}`; shared `components/{header,footer,theme-toggle,countdown,print-button}.tsx`; tokens in `app/theme.css`, all styling in `app/globals.css`; content models in `lib/content.ts` (fill typed arrays to populate pages), event logic in `lib/event.ts` (set `conferenceWindow` with ISO offsets + IANA zone when date confirmed).
- Next 16 renders nav hrefs with trailing slashes (`trailingSlash: true`); use text/role locators, not href selectors, in tests.
- QA scripts: `scripts/qa.mjs` (screenshots), `scripts/qa-assert.mjs` (46 functional/a11y assertions, needs `npx serve out -l 3000` running); tests: `npm test` (tsx --test).
- The `out/` dir can get locked by the running server: stop node `serve` processes before rebuilding.
- `working.md`: update after every meaningful unit; read this AND git status/diff at every session start.
- Commit each completed, verified unit; no git identity changes or secret commits.

## Deployment blockers/checklist
- Cloudflare account/project and Supabase project access not provided.
- All required environment variables must be configured in the Cloudflare Pages dashboard for relevant production/preview environments, not only local .env files; rebuild for public build-time variables.
- Never expose a Supabase service-role/secret key to browser bundles.
- Do not call deployment complete until the live Pages URL and registration privacy/behavior have actually been verified.
