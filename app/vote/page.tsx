import { Suspense } from "react";
import type { Metadata } from "next";
import {
  VotePageContent,
  VoteSkeleton,
} from "@/components/vote-page-content";

export const metadata: Metadata = {
  title: "Vote | COMPASS",
  description:
    "Vote for the best student presentation at COMPASS, the student-led medical conference at Beni Suef National University.",
};

export default function VotePage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading vote-heading reveal">
        <div>
          <p className="vote-eyebrow">Voting</p>
          <h1>Best student presentation</h1>
        </div>
      </header>
      {/* Suspense is required because VotePageContent reads ?preview=true. */}
      <Suspense fallback={<VoteSkeleton />}>
        <VotePageContent />
      </Suspense>
    </main>
  );
}
