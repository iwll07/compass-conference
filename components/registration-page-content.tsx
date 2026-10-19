"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Compass } from "@phosphor-icons/react";
import { RegistrationForm } from "@/components/registration-form";
import { RegistrationFormSkeleton } from "@/components/registration-skeleton";
import { useRegistrationStatus } from "@/lib/registration-status";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const emptySubscribe = () => () => {};

export function RegistrationPageContent() {
  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "true";
  const [hasSession, setHasSession] = useState<boolean>(false);
  const { status, loading } = useRegistrationStatus();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !isPreviewParam) return;
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        setHasSession(!!data.session);
      });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setHasSession(!!session);
      });
      return () => {
        subscription.unsubscribe();
      };
    } catch {}
  }, [isPreviewParam]);

  // Only honour preview mode when a signed-in Supabase session exists
  const isPreviewActive = isPreviewParam && hasSession;

  // During SSR and initial hydration pass, render skeleton matching static fallback
  if (!isMounted) {
    return <RegistrationFormSkeleton />;
  }

  // If preview mode is verified for admin or registration is open, render the live form
  const showForm = isPreviewActive || status === "open";

  // While registration status is unknown on first load, render neutral skeleton
  if (loading && !isPreviewActive) {
    return <RegistrationFormSkeleton />;
  }

  return (
    <div suppressHydrationWarning>
      {isPreviewActive && (
        <aside className="admin-preview-banner" role="status" aria-label="Admin preview mode">
          <div className="admin-preview-banner-text">
            <strong>Admin Form Preview</strong>
            <span>
              Public status is currently:{" "}
              <strong className="preview-status-tag">{status}</strong>. Submissions made in preview are real registrations.
            </span>
          </div>
          <Link href="/admin#admin-registrations" className="admin-preview-back-link">
            Return to admin
          </Link>
        </aside>
      )}

      {showForm ? (
        <div className="reveal reveal-visible" style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
          <RegistrationForm />
        </div>
      ) : status === "closed" ? (
        <section className="empty-state reveal reveal-visible" aria-labelledby="registration-closed">
          <Compass className="empty-mark" size={72} weight="light" aria-hidden="true" />
          <h2 id="registration-closed">Registration closed.</h2>
          <p>
            Registration for COMPASS 2026 is now closed. Thank you to everyone who registered.
          </p>
        </section>
      ) : (
        <section className="empty-state reveal reveal-visible" aria-labelledby="registration-coming-soon">
          <Compass className="empty-mark" size={72} weight="light" aria-hidden="true" />
          <h2 id="registration-coming-soon">Coming soon.</h2>
          <p>
            Registration is not open yet. Confirmed registration details will be published here.
          </p>
        </section>
      )}
    </div>
  );
}
