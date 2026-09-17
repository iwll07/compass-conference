# COMPASS working log

## Current state
- Hero redesigned (commit `4e263c2`, pushed): full-bleed `public/college.jpeg` (800x533, user-supplied), compass plate removed, text centered; scrims are tokens `--hero-scrim`/`--hero-ink`/`--hero-muted` in `app/theme.css` (light: navy 0.55, dark: near-black 0.68). Verified with screenshots (light/dark/mobile) + 12 computed-style assertions (`scripts/hero-def-check.mjs`).
- LIVE on Cloudflare Workers (static assets): https://compass-conference.iwllwill01.workers.dev/ — full 46-assertion QA suite passed against production (BASE_URL env var in scripts/qa-assert.mjs).
- Deploy model: Cloudflare Workers build pipeline (not classic Pages) — build command `npm run build`, deploy command `npx wrangler deploy`, config in `wrangler.jsonc` (assets.directory=./out, not_found_handling=404-page). Verified locally via clean-clone build + `wrangler deploy --dry-run` before push.
- Code pushed to GitHub: https://github.com/iwll07/compass-conference (origin/master, tracking, in sync).
- Committed through `9ffa89c` "Build COMPASS static site: 7 pages, theme layer, countdown, print agenda, QA suites" (root commit, working tree clean at commit time).
- Full verification suite green: lint, typecheck, 6 countdown unit tests, 46 browser assertions, 8-route static build.
- Git identity: iwll07 <iwllwill01@gmail.com> (repo-local). Note: Windows credential manager previously held a different GitHub account (bmsadev); resolved via `git credential-manager github login` as iwll07.
- Setup and minimal Next.js 16.3.5 App Router static-export scaffold complete.
- User approved static export instead of the deprecated adapter, and chose to WAIT for exact registration fields (no form/schema until supplied).
- `npm install` succeeded (0 vulnerabilities); `npx next build`, `npm run lint`, and `npm run typecheck` passed. `out/index.html` and static 404 output verified. This is local export verification, NOT live Cloudflare deployment.
- Native Node remains 22.6.0; `.nvmrc` requests 22.14.0. Engine warnings remain until the actual runtime is upgraded.
- Build timeout was only the combined install/check command; separate commands succeeded.

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
- [x] Live Workers deployment and runtime verification (46/46 against https://compass-conference.iwllwill01.workers.dev/).

## Remaining (awaiting user input)
- [ ] Registration form + Supabase schema/RLS: WAITING on exact fields/payment/capacity decisions (user explicitly chose to wait).
- [ ] Conference date/time (then wire into lib/event.ts conferenceWindow + countdown).
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
