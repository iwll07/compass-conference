import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type RegistrationStatus = "soon" | "open" | "closed";

export const DEFAULT_REGISTRATION_STATUS: RegistrationStatus = "soon";

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  soon: "Registration soon",
  open: "Register now",
  closed: "Registration closed",
};

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
 * React hook to read the registration status with live cross-tab / cross-component updates.
 */
export function useRegistrationStatus() {
  const [status, setStatus] = useState<RegistrationStatus>(DEFAULT_REGISTRATION_STATUS);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const next = await fetchRegistrationStatus();
    setStatus(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchRegistrationStatus().then((s) => {
      if (active) {
        setStatus(s);
        setLoading(false);
      }
    });

    const onCustomChange = (e: Event) => {
      const custom = e as CustomEvent<{ status: RegistrationStatus }>;
      if (custom.detail?.status) {
        setStatus(custom.detail.status);
      } else {
        refresh();
      }
    };

    window.addEventListener("compass-reg-status-changed", onCustomChange);
    return () => {
      active = false;
      window.removeEventListener("compass-reg-status-changed", onCustomChange);
    };
  }, [refresh]);

  return { status, loading, setStatus, refresh };
}
