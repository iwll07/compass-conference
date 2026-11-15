"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { votingCandidates } from "@/lib/voting-candidates";
import {
  fetchVotingResults,
  updateVotingSettings,
  useVotingSettings,
} from "@/lib/voting-status";
import {
  getVotePercentage,
  type VotingResults,
  type VotingStatus,
} from "@/lib/voting";

const STATUS_OPTIONS: {
  value: VotingStatus;
  label: string;
  sub: string;
  dot: string;
}[] = [
  {
    value: "soon",
    label: "Coming soon",
    sub: "Lineup visible, voting not open",
    dot: "reg-status-dot-soon",
  },
  {
    value: "open",
    label: "Open",
    sub: "Vote buttons are live",
    dot: "reg-status-dot-open",
  },
  {
    value: "closed",
    label: "Closed",
    sub: "Results are public",
    dot: "reg-status-dot-closed",
  },
];

/**
 * Voting controls for the admin page. Every signed-in user may change the
 * status and the live-results flag, matching the UPDATE grant in the voting
 * migration.
 *
 * The counts table always works for a signed-in session: voting_results()
 * returns tallies to authenticated callers regardless of the public status.
 */
export function AdminVoting() {
  const { status, liveResults, loading, refresh } = useVotingSettings();
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // undefined = loading, null = request failed.
  const [results, setResults] = useState<VotingResults | null | undefined>(
    undefined
  );
  const [resultsVersion, setResultsVersion] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await fetchVotingResults();
      if (active) setResults(next);
    })();
    return () => {
      active = false;
    };
  }, [resultsVersion]);

  const refreshAll = useCallback(() => {
    setResults(undefined);
    setResultsVersion((version) => version + 1);
    refresh();
  }, [refresh]);

  async function changeStatus(next: VotingStatus): Promise<void> {
    if (next === status || updating) return;
    setUpdating(true);
    setError(null);
    setNotice(null);

    const { error: err } = await updateVotingSettings({ status: next });
    setUpdating(false);

    if (err) {
      setError(`Could not change voting status: ${err.message}`);
      return;
    }

    setNotice(`Voting is now ${next}.`);
  }

  async function toggleLiveResults(): Promise<void> {
    if (updating) return;
    const next = !liveResults;
    setUpdating(true);
    setError(null);
    setNotice(null);

    const { error: err } = await updateVotingSettings({ liveResults: next });
    setUpdating(false);

    if (err) {
      setError(`Could not change live results: ${err.message}`);
      return;
    }

    setNotice(
      next
        ? "Live results are now visible while voting is open."
        : "Live results are hidden while voting is open."
    );
  }

  const total = results?.total ?? 0;
  const votesById = new Map(
    (results?.candidates ?? []).map((candidate) => [
      candidate.id,
      candidate.votes,
    ])
  );

  // Candidates come from the JSON so the table keeps the presentation's name
  // even at zero votes. Any id the database knows about but the JSON does not
  // is appended, so seed drift shows up here instead of vanishing.
  const knownIds = new Set(votingCandidates.map((candidate) => candidate.id));
  const rows = [
    ...votingCandidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.presenter,
      title: candidate.title,
      votes: votesById.get(candidate.id) ?? 0,
    })),
    ...(results?.candidates ?? [])
      .filter((candidate) => !knownIds.has(candidate.id))
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.id,
        title: "Not in lib/voting-candidates.json",
        votes: candidate.votes,
      })),
  ];

  const busy = loading || updating;

  return (
    <details className="admin-collapse" id="admin-voting" open>
      <summary className="admin-collapse-summary">
        <span>Voting</span>
        <span className="admin-collapse-count">
          {status === "soon" ? "Soon" : status === "open" ? "Open" : "Closed"}
        </span>
      </summary>

      <div className="admin-collapse-body">
        <section className="vote-admin-section" aria-label="Voting status control">
          <h3 className="reg-status-title">Best student presentation</h3>
          <p className="reg-status-desc">
            Controls the public vote page. All admins can change the status and
            publish live results.
          </p>

          <div
            className="reg-status-options vote-admin-status"
            role="radiogroup"
            aria-label="Public voting status"
          >
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={status === option.value}
                disabled={busy}
                className={`reg-status-pill ${
                  status === option.value ? "reg-status-pill-active" : ""
                }`}
                onClick={() => changeStatus(option.value)}
              >
                <span
                  className={`reg-status-dot ${option.dot}`}
                  aria-hidden="true"
                />
                <span className="reg-status-pill-text">
                  <span className="reg-status-pill-label">{option.label}</span>
                  <span className="reg-status-pill-sub">{option.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <label className="vote-admin-toggle">
            <input
              type="checkbox"
              checked={liveResults}
              disabled={busy}
              onChange={toggleLiveResults}
            />
            <span className="vote-admin-toggle-text">
              <span className="vote-admin-toggle-label">
                Show live results while voting is open
              </span>
              <span className="vote-admin-toggle-hint">
                When off, the public sees only a thank-you after voting until
                you close voting.
              </span>
            </span>
          </label>
        </section>

        {notice ? (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="vote-admin-results" aria-label="Voting results">
          <div className="vote-admin-results-head">
            <h3>Results</h3>
            <button
              type="button"
              className="button button-secondary vote-admin-refresh"
              onClick={refreshAll}
              disabled={results === undefined}
            >
              <ArrowsClockwiseIcon size={15} aria-hidden="true" />
              <span className="button-label">
                {results === undefined ? "Refreshing…" : "Refresh"}
              </span>
            </button>
          </div>

          {results === null ? (
            <p className="admin-note">
              Results are unavailable right now. Use Refresh to try again.
            </p>
          ) : null}

          {results !== undefined && results !== null && rows.length === 0 ? (
            <p className="admin-note">No candidates yet.</p>
          ) : null}

          {results !== undefined && results !== null && rows.length > 0 ? (
            <div className="vote-admin-table-wrap">
              <table className="vote-admin-table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col" className="vote-admin-num">
                      Votes
                    </th>
                    <th scope="col" className="vote-admin-num">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="vote-admin-cand">
                          <span className="vote-admin-cand-name">{row.name}</span>
                          <span className="vote-admin-cand-title">
                            {row.title}
                          </span>
                        </span>
                      </td>
                      <td className="vote-admin-num">{row.votes}</td>
                      <td className="vote-admin-num">
                        {getVotePercentage(row.votes, total)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="vote-admin-total">
                <span>{total} votes cast</span>
              </p>
            </div>
          ) : null}

          <p className="admin-hint vote-admin-note">
            To reset test votes, delete rows from the <code>votes</code> table in
            Supabase.
          </p>
        </section>
      </div>
    </details>
  );
}
