// Shared, pure logic for the "Best student presentation" vote.
//
// Nothing here touches React, Supabase or the DOM. The page and the admin
// section both use these helpers, and tests/voting.test.ts covers them.

export type VotingStatus = "soon" | "open" | "closed";

export type VoteResultCode =
  | "ok"
  | "closed"
  | "invalid"
  | "not_registered"
  | "already_voted";

/** Cosmetic localStorage marker: the id of the candidate this browser picked. */
export const VOTE_STORAGE_KEY = "compass-vote";

const VOTE_RESULT_MESSAGES: Record<VoteResultCode, string> = {
  ok: "Your vote has been recorded. Thank you for taking part.",
  closed: "Voting is closed.",
  invalid: "Check the email address and try again.",
  not_registered:
    "Use the email that had the attendance QR sent to.",
  already_voted: "This email has already voted. Thank you.",
};

/**
 * Turn the code returned by cast_vote() into a sentence for the dialog.
 * Unknown codes fall back to a neutral retry message rather than leaking a
 * database error to the voter.
 */
export function mapVoteResult(code: string | null | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(VOTE_RESULT_MESSAGES, code)) {
    return VOTE_RESULT_MESSAGES[code as VoteResultCode];
  }
  return "Something went wrong. Please try again.";
}

export function isVotingStatus(value: unknown): value is VotingStatus {
  return value === "soon" || value === "open" || value === "closed";
}

/** Accounts allowed to wipe every vote at once, to clear test votes.
 *  Mirrors the clear_all_votes() function in
 *  supabase/migrations/20261115000300_create_clear_all_votes.sql — keep in sync.
 *  This list only controls UI visibility; the database function is the real gate. */
export const VOTING_RESET_EMAILS: readonly string[] = ["fares9005@gmail.com"];

/** The word someone must type to confirm a full vote reset. */
export const VOTE_RESET_CONFIRMATION = "RESET";

export function canResetVotes(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return VOTING_RESET_EMAILS.some((admin) => admin.toLowerCase() === clean);
}

export type VotingTally = {
  id: string;
  votes: number;
};

export type VotingWinner = {
  /** Candidate ids sharing the highest vote count. Empty when nobody voted. */
  winners: string[];
  /** The shared highest vote count. Zero when nobody voted. */
  votes: number;
};

/**
 * Winner or joint winners. Returns no winner when every tally is zero (or the
 * list is empty), so a closed contest with no votes never shows a trophy.
 */
export function getVoteWinners(tallies: readonly VotingTally[]): VotingWinner {
  let highest = 0;
  for (const tally of tallies) {
    if (Number.isFinite(tally.votes) && tally.votes > highest) {
      highest = tally.votes;
    }
  }

  if (highest <= 0) {
    return { winners: [], votes: 0 };
  }

  return {
    winners: tallies
      .filter((tally) => tally.votes === highest)
      .map((tally) => tally.id),
    votes: highest,
  };
}

/** Whole-number percentage for result bars. Zero total means zero, not NaN. */
export function getVotePercentage(votes: number, total: number): number {
  if (!Number.isFinite(votes) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  const percentage = (votes / total) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

export type VotingCandidateResult = {
  id: string;
  votes: number;
};

export type VotingResults = {
  status: VotingStatus;
  live_results: boolean;
  total: number;
  candidates: VotingCandidateResult[];
};
