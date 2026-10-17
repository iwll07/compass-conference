import type { Metadata } from "next";
import { RegistrationForm } from "@/components/registration-form";

export const metadata: Metadata = {
  title: "Registration | COMPASS",
  description:
    "Register for COMPASS at the Faculty of Medicine, Beni Suef National University. Registration is open.",
};

export default function RegistrationPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Registration</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>
          Your place at COMPASS starts here.
        </p>
      </header>
      <div className="reveal" style={{ "--reveal-delay": "160ms" } as React.CSSProperties}>
        <RegistrationForm />
      </div>
    </main>
  );
}
