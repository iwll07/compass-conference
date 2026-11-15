"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useVotingSettings } from "@/lib/voting-status";

/**
 * Hero call to action for the "Best student presentation" vote, sitting under
 * the registration call.
 *
 * It renders nothing until the contest is open or closed, so the hero never
 * advertises a ballot that cannot be cast. While open it is a real link to
 * /vote/; once closed it becomes an inert, dimmed badge reading "Voting closed"
 * — the same shape as the registration call's closed state — so the hero stops
 * offering a vote without the row collapsing to nothing.
 *
 * useVotingSettings() is cache-first and hydration-safe: the server snapshot is
 * "soon" (nothing rendered), so the markup matches during hydration and the
 * button appears only once the browser has the real status.
 */
export function HeroVoteCta() {
  const { status } = useVotingSettings();

  if (status !== "open" && status !== "closed") return null;

  return (
    <div className="hero-vote-cta" suppressHydrationWarning>
      {status === "open" ? (
        <Link className="button hover-lift" href="/vote/">
          Vote for the best presentation
          <ArrowRightIcon size={18} aria-hidden="true" />
        </Link>
      ) : (
        <span className="button hero-vote-disabled" aria-disabled="true">
          Voting closed
        </span>
      )}
    </div>
  );
}
