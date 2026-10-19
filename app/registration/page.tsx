import { Suspense } from "react";
import type { Metadata } from "next";
import { RegistrationPageContent } from "@/components/registration-page-content";
import { RegistrationFormSkeleton } from "@/components/registration-skeleton";

export const metadata: Metadata = {
  title: "Registration | COMPASS",
  description:
    "Register for COMPASS at the Faculty of Medicine, Beni Suef National University.",
};

export default function RegistrationPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Registration</h1>
        <p
          className="reveal"
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
        >
          Your place at COMPASS starts here.
        </p>
      </header>
      <Suspense fallback={<RegistrationFormSkeleton />}>
        <RegistrationPageContent />
      </Suspense>
    </main>
  );
}
