// Browser Supabase client.
//
// The site is a fully static export (`output: "export"` in next.config.ts), so
// there is no Next.js server to broker these calls — every Supabase request
// (REST for the announcements table, Auth for the admin magic link) is made
// directly from the browser. That is why the key here is the PUBLISHABLE key
// and never the secret key: the publishable key only reaches what RLS allows,
// and the secret key would bypass RLS entirely and must never enter a bundle.
//
// The env var is named ...ANON_KEY for continuity with the wider Supabase
// ecosystem, but the value it holds is a publishable key (`sb_publishable_…`).
// Legacy `anon` keys are deprecated by Supabase and stop working at the end of
// 2026.
//
// The client is created lazily rather than at module scope so that a build (or
// a page that never touches Supabase) cannot fail just because the env vars are
// absent. Announcements degrade to "nothing rendered" when unconfigured.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False when the env vars are missing — callers render their fallback state. */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

let client: SupabaseClient | null = null;

/**
 * Singleton Supabase client. Idempotent: the same instance is returned on every
 * call, which matters because persisting a session means each new instance
 * would otherwise re-read localStorage and risk racing itself on auth state.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // persistSession: the admin's magic-link session survives reloads and
      // navigation. detectSessionInUrl: Supabase puts the session in the
      // magic-link redirect's URL hash and strips it, which is what makes
      // /admin resume an existing session when the link is followed.
      auth: { persistSession: true, detectSessionInUrl: true },
    });
  }
  return client;
}
