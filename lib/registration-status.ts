import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type RegistrationStatus = "soon" | "open" | "closed";

export const DEFAULT_REGISTRATION_STATUS: RegistrationStatus = "soon";
export const REGISTRATION_STATUS_CACHE_KEY = "compass-reg-status";

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  soon: "Registration soon",
  open: "Register now",
  closed: "Registration closed",
};

/**
 * Synchronously read cached registration status from localStorage if available.
 */
export function getCachedRegistrationStatus(): RegistrationStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(REGISTRATION_STATUS_CACHE_KEY);
    if (val === "soon" || val === "open" || val === "closed") {
      return val;
    }
  } catch {}
  return null;
}

/**
 * Persist registration status to localStorage.
 */
export function setCachedRegistrationStatus(status: RegistrationStatus): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTRATION_STATUS_CACHE_KEY, status);
  } catch {}
}

/**
 * Fetch the current registration status from Supabase public.registration_settings.
 * Falls back to DEFAULT_REGISTRATION_STATUS ('soon') on missing config, error, or unrecognized value.
 */
export async function fetchRegistrationStatus(): Promise<RegistrationStatus> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_REGISTRATION_STATUS;

  try {
    const { data, error } = await supabase
      .from("registration_settings")
      .select("status")
      .eq("id", "current")
      .maybeSingle();

    if (error || !data?.status) {
      return DEFAULT_REGISTRATION_STATUS;
    }

    const val = data.status;
    if (val === "soon" || val === "open" || val === "closed") {
      setCachedRegistrationStatus(val);
      return val;
    }
    return DEFAULT_REGISTRATION_STATUS;
  } catch {
    return DEFAULT_REGISTRATION_STATUS;
  }
}

/**
 * Update the registration status in Supabase public.registration_settings.
 * Any signed-in admin (authenticated user) has UPDATE permission.
 */
export async function updateRegistrationStatus(
  status: RegistrationStatus
): Promise<{ error: Error | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  try {
    const { error } = await supabase
      .from("registration_settings")
      .update({ status })
      .eq("id", "current");

    if (error) {
      return { error: new Error(error.message) };
    }

    setCachedRegistrationStatus(status);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("compass-reg-status-changed", { detail: { status } })
      );
    }

    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * React hook to read the registration status with instant cache-first lookup and live updates.
 */
export function useRegistrationStatus() {
  const [status, setStatus] = useState<RegistrationStatus>(() => {
    return getCachedRegistrationStatus() ?? DEFAULT_REGISTRATION_STATUS;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return getCachedRegistrationStatus() === null;
  });

  const refresh = useCallback(async () => {
    const next = await fetchRegistrationStatus();
    setCachedRegistrationStatus(next);
    setStatus(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchRegistrationStatus().then((s) => {
      if (active) {
        setCachedRegistrationStatus(s);
        setStatus(s);
        setLoading(false);
      }
    });

    const onCustomChange = (e: Event) => {
      const custom = e as CustomEvent<{ status: RegistrationStatus }>;
      if (custom.detail?.status) {
        setCachedRegistrationStatus(custom.detail.status);
        setStatus(custom.detail.status);
        setLoading(false);
      } else {
        refresh();
      }
    };

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === REGISTRATION_STATUS_CACHE_KEY && e.newValue) {
        const val = e.newValue as RegistrationStatus;
        if (val === "soon" || val === "open" || val === "closed") {
          setStatus(val);
          setLoading(false);
        }
      }
    };

    window.addEventListener("compass-reg-status-changed", onCustomChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      active = false;
      window.removeEventListener("compass-reg-status-changed", onCustomChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [refresh]);

  return { status, loading, setStatus, refresh };
}
