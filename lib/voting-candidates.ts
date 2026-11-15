// Presentation data for the "Best student presentation" contest.
//
// The JSON file is the source of truth because scripts/voting-seed.mjs reads it
// too (via Node, without a TypeScript step). Keep it in presentation order: the
// array order becomes the seed position, and position drives display order in
// voting_results().
//
// To add a presentation:
//   1. add an entry here (kebab-case id, no spaces),
//   2. drop a square ~480x480 PNG/WebP at public/voting/<id>.<ext>,
//   3. run `npm run voting:seed`, then paste the SQL into Supabase.
//
// university / academicYear may be empty; the card then omits that meta line.
import candidates from "./voting-candidates.json";

export type VotingCandidate = {
  id: string;
  presenter: string;
  /** Second presenter, for a talk given by two people. */
  coPresenter?: string;
  title: string;
  /** Optional one-line description shown under the title. */
  summary?: string;
  university: string;
  academicYear: string;
  /** Path under public/, or null for an initials circle. */
  photo: string | null;
  coPresenterPhoto?: string | null;
};

export const votingCandidates = candidates as VotingCandidate[];
