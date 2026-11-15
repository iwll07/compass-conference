// Prints the SQL that syncs public.voting_candidates with lib/voting-candidates.json.
//
// Usage: npm run voting:seed
// Then paste the printed SQL into the Supabase SQL Editor.
//
// It only prints — it never connects to Supabase, so it cannot write to the
// live database by accident.
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVotingSeedSql } from "../lib/voting-seed.ts";

const candidatesPath = path.join(process.cwd(), "lib", "voting-candidates.json");

let candidates;
try {
  candidates = JSON.parse(readFileSync(candidatesPath, "utf8"));
} catch (error) {
  console.error(`Could not read ${candidatesPath}:`, error.message);
  process.exit(1);
}

process.stdout.write(buildVotingSeedSql(candidates) + "\n");
