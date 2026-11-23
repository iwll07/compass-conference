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
 * /vote/ in both states. While open it invites a vote; once closed it becomes
 * a live link to the published results, so the CTA stays useful instead of
 * turning into a dead, dimmed badge.
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
      <Link className="button hover-lift" href="/vote/">
        {status === "open"
          ? "Vote for the best presentation"
          : "Voting closed — view results"}
        <ArrowRightIcon size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
