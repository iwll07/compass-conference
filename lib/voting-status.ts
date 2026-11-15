import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  isVotingStatus,
  type VotingCandidateResult,
  type VotingResults,
  type VotingStatus,
} from "@/lib/voting";

export type VotingSettings = {
  status: VotingStatus;
  liveResults: boolean;
};

export const DEFAULT_VOTING_SETTINGS: VotingSettings = {
  status: "soon",
  liveResults: false,
};

export const VOTING_SETTINGS_CACHE_KEY = "compass-voting-settings";

/** Synchronously read cached settings from localStorage if available. */
let cachedRaw: string | null | undefined;
let cachedSettings: VotingSettings | null = null;

function parseSettings(raw: string | null): VotingSettings | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (!isVotingStatus(record.status)) return null;
    return {
      status: record.status,
      liveResults: record.liveResults === true,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the same object while localStorage is unchanged. useSyncExternalStore
 * compares snapshots by reference, so re-parsing on every call would loop.
 */
export function getCachedVotingSettings(): VotingSettings | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VOTING_SETTINGS_CACHE_KEY);
  } catch {
    return null;
  }

  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;
  cachedSettings = parseSettings(raw);
  return cachedSettings;
}

export function setCachedVotingSettings(settings: VotingSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      VOTING_SETTINGS_CACHE_KEY,
      JSON.stringify({
        status: settings.status,
        liveResults: settings.liveResults,
      })
    );
    cachedRaw = localStorage.getItem(VOTING_SETTINGS_CACHE_KEY);
    cachedSettings = settings;
  } catch {}
}

function emitChange(settings: VotingSettings): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("compass-voting-settings-changed", { detail: settings })
  );
}

/**
 * Read the current contest settings from public.voting_settings.
 * Falls back to the default ('soon', hidden results) on any error.
 */
export async function fetchVotingSettings(): Promise<VotingSettings> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_VOTING_SETTINGS;

  try {
    const { data, error } = await supabase
      .from("voting_settings")
      .select("status, live_results")
      .eq("id", "current")
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_VOTING_SETTINGS;
    }

    const settings: VotingSettings = {
      status: isVotingStatus(data.status) ? data.status : "soon",
      liveResults: data.live_results === true,
    };
    setCachedVotingSettings(settings);
    return settings;
  } catch {
    return DEFAULT_VOTING_SETTINGS;
  }
}

/**
 * Update the contest settings. Any signed-in user may change status and the
 * live-results flag, matching the UPDATE grant in the migration.
 */
export async function updateVotingSettings(
  patch: Partial<VotingSettings>
): Promise<{ error: Error | null; settings: VotingSettings }> {
  const current = getCachedVotingSettings() ?? DEFAULT_VOTING_SETTINGS;
  const supabase = getSupabase();
  if (!supabase) {
    return { error: new Error("Supabase is not configured."), settings: current };
  }

  const update: { status?: VotingStatus; live_results?: boolean } = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.liveResults !== undefined) update.live_results = patch.liveResults;

  if (Object.keys(update).length === 0) {
    return { error: null, settings: current };
  }

  try {
    const { error } = await supabase
      .from("voting_settings")
      .update(update)
      .eq("id", "current");

    if (error) {
      return { error: new Error(error.message), settings: current };
    }

    const settings: VotingSettings = {
      status: patch.status ?? current.status,
      liveResults: patch.liveResults ?? current.liveResults,
    };
    setCachedVotingSettings(settings);
    emitChange(settings);
    return { error: null, settings };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err : new Error(String(err)),
      settings: current,
    };
  }
}

/**
 * Read the results payload from voting_results(). Returns null when Supabase
 * is unavailable or the response is malformed — callers show a retry message
 * rather than inventing numbers.
 */
export async function fetchVotingResults(): Promise<VotingResults | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc("voting_results");
    if (error || !data || typeof data !== "object") return null;

    const record = data as Record<string, unknown>;

    const candidates: VotingCandidateResult[] = Array.isArray(record.candidates)
      ? record.candidates.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const entry = item as Record<string, unknown>;
          if (typeof entry.id !== "string") return [];
          const votes =
            typeof entry.votes === "number" && Number.isFinite(entry.votes)
              ? Math.max(0, entry.votes)
              : 0;
          return [{ id: entry.id, votes }];
        })
      : [];

    const total =
      typeof record.total === "number" && Number.isFinite(record.total)
        ? Math.max(0, record.total)
        : candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

    return {
      status: isVotingStatus(record.status) ? record.status : "soon",
      live_results: record.live_results === true,
      total,
      candidates,
    };
  } catch {
    return null;
  }
}

/**
 * Cast one vote. Returns the raw code from cast_vote(); throws only when the
 * request itself fails (network / configuration), which the dialog reports as
 * a retry message.
 */
export async function castVote(
  candidateId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.rpc("cast_vote", {
    p_candidate_id: candidateId,
    p_phone: phone,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "";
}

function subscribeToVotingSettings(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("compass-voting-settings-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("compass-voting-settings-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

function getVotingSettingsSnapshot(): VotingSettings {
  return getCachedVotingSettings() ?? DEFAULT_VOTING_SETTINGS;
}

function getVotingSettingsServerSnapshot(): VotingSettings {
  return DEFAULT_VOTING_SETTINGS;
}

/**
 * Cache-first settings hook with the same hydration-safe pattern as
 * useRegistrationStatus(). `loading` is true until the first fetch resolves
 * when nothing is cached.
 */
export function useVotingSettings() {
  const settings = useSyncExternalStore(
    subscribeToVotingSettings,
    getVotingSettingsSnapshot,
    getVotingSettingsServerSnapshot
  );

  const [loading, setLoading] = useState<boolean>(() => {
    return typeof window === "undefined" || getCachedVotingSettings() === null;
  });

  const refresh = useCallback(async () => {
    const next = await fetchVotingSettings();
    setCachedVotingSettings(next);
    emitChange(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchVotingSettings().then((next) => {
      if (!active) return;
      setCachedVotingSettings(next);
      emitChange(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    status: settings.status,
    liveResults: settings.liveResults,
    loading,
    refresh,
  };
}
