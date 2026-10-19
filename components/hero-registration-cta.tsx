"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useRegistrationStatus } from "@/lib/registration-status";

export function HeroRegistrationCta() {
  const { status } = useRegistrationStatus();

  return (
    <div className="hero-cta-row" suppressHydrationWarning>
      {status === "open" ? (
        <Link className="button hover-lift" href="/registration">
          Register now
          <ArrowRightIcon size={18} aria-hidden="true" />
        </Link>
      ) : status === "closed" ? (
        <span className="button hero-register-disabled" aria-disabled="true">
          Registration closed
        </span>
      ) : (
        <span className="button hero-register-disabled" aria-disabled="true">
          Registration soon
        </span>
      )}
    </div>
  );
}
