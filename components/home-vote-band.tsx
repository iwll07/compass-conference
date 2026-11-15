"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useVotingSettings } from "@/lib/voting-status";

/**
 * Slim band under the announcements that points at /vote/ for as long as the
 * contest is open, and at the public results once it closes. It renders
 * nothing in the "soon" state so the homepage does not advertise a vote that
 * cannot be cast yet.
 *
 * useVotingSettings() is cache-first and hydration-safe: the server snapshot
 * is "soon" (band hidden), so the markup matches during hydration and the band
 * appears only after the browser has the real status.
 */
export function HomeVoteBand() {
  const { status } = useVotingSettings();

  if (status !== "open" && status !== "closed") return null;

  const open = status === "open";

  return (
    <section className="home-vote" aria-label="Best student presentation">
      <p className="home-vote-eyebrow">Best student presentation</p>
      <Link className="text-link home-vote-link" href="/vote/">
        {open ? "Vote for the best student presentation" : "See the results"}
        <ArrowRightIcon size={18} aria-hidden="true" />
      </Link>
    </section>
  );
}
