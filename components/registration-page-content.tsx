"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Compass } from "@phosphor-icons/react";
import { RegistrationForm } from "@/components/registration-form";
import { useRegistrationStatus } from "@/lib/registration-status";

export function RegistrationPageContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const { status } = useRegistrationStatus();

  // If preview mode is requested or registration is open, render the live form
  const showForm = isPreview || status === "open";

  const subhead = isPreview
    ? "Admin preview — test the live registration form before opening."
    : status === "closed"
    ? "Registration for COMPASS 2026 is now closed."
    : status === "open"
    ? "Your place at COMPASS starts here."
    : "Your place at COMPASS starts here, once registration opens.";

  return (
    <>
      {isPreview && (
        <aside className="admin-preview-banner" role="status" aria-label="Admin preview mode">
          <div className="admin-preview-banner-text">
            <strong>Admin Form Preview</strong>
            <span>
              Public status is currently:{" "}
              <strong className="preview-status-tag">{status}</strong>
            </span>
          </div>
          <Link href="/admin#admin-registrations" className="admin-preview-back-link">
            Return to admin
          </Link>
        </aside>
      )}

      <header className="page-heading">
        <h1 className="reveal">Registration</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          {subhead}
        </p>
      </header>

      {showForm ? (
        <div className="reveal" style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
          <RegistrationForm />
        </div>
      ) : status === "closed" ? (
        <section className="empty-state reveal" aria-labelledby="registration-closed">
          <Compass className="empty-mark" size={72} weight="light" aria-hidden="true" />
          <h2 id="registration-closed">Registration closed.</h2>
          <p>
            Registration for COMPASS 2026 is now closed. Thank you to everyone who registered.
          </p>
        </section>
      ) : (
        <section className="empty-state reveal" aria-labelledby="registration-coming-soon">
          <Compass className="empty-mark" size={72} weight="light" aria-hidden="true" />
          <h2 id="registration-coming-soon">Coming soon.</h2>
          <p>
            Registration is not open yet. Confirmed registration details will be published here.
          </p>
        </section>
      )}
    </>
  );
}
