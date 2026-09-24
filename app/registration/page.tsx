import type { Metadata } from "next";
import { Compass } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Registration | COMPASS",
  description:
    "Registration for COMPASS at the Faculty of Medicine, BSNU is coming soon. Registration is not open yet.",
};

export default function RegistrationPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Registration</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>Your place at COMPASS starts here, once registration opens.</p>
      </header>
      <section className="empty-state reveal" aria-labelledby="registration-coming-soon">
        <Compass className="empty-mark" size={72} weight="light" aria-hidden="true" />
        <h2 id="registration-coming-soon">Coming soon.</h2>
        <p>
          Registration is not open yet. Confirmed registration details will be published here.
        </p>
      </section>
    </main>
  );
}
