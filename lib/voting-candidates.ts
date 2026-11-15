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
// photoShift / coPresenterShift are optional presentation-only nudges (percent
// of the cut-out's own width, positive = right) for portraits that are cropped
// off-centre inside their file; they never reach the database.
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
  /**
   * Horizontal nudge for the cut-out, in percent of its own rendered width;
   * positive moves it right. Purely presentational and optional — only needed
   * when a portrait is cropped off-centre inside its own file, so the cut can
   * be parked on the card border (negative) or the figure can be shifted
   * towards a co-presenter (positive). Omit for a centred cut-out.
   */
  photoShift?: number;
  /** Same, for the second presenter's cut-out. */
  coPresenterShift?: number;
};

export const votingCandidates = candidates as VotingCandidate[];
