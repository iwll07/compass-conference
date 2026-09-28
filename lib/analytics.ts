// Cloudflare Web Analytics beacon token.
//
// NOT a secret: the beacon token is served in the page HTML by design (the
// snippet in app/layout.tsx embeds it in a data-cf-beacon attribute), so it is
// public by definition and needs no build-time env var or server secret.
//
// Lives here for the same reason the call links live in lib/calls.ts — one
// place to edit. Rotating the token, or removing analytics entirely, means
// changing this file (and the script tag + both CSP entries; see working.md).
export const CLOUDFLARE_ANALYTICS_TOKEN = "21fb769a8dcc47c398c4d7df71518fd7";

// Hosts the beacon needs in the Content-Security-Policy (public/_headers).
// Kept beside the token so the script tag and the policy cannot drift apart.
export const CLOUDFLARE_BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
export const CLOUDFLARE_CONNECT_SRC = "https://cloudflareinsights.com";
