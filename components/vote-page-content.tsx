"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { TrophyIcon, XIcon } from "@phosphor-icons/react";
import { getInitials } from "@/lib/honorees";
import { votingCandidates, type VotingCandidate } from "@/lib/voting-candidates";
import { CompassRose } from "@/components/compass-rose";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  castVote,
  fetchVotingResults,
  useVotingSettings,
} from "@/lib/voting-status";
import {
  getVotePercentage,
  getVoteWinners,
  mapVoteResult,
  VOTE_STORAGE_KEY,
  type VotingResults,
} from "@/lib/voting";

const emptySubscribe = () => () => {};

function presenterNames(candidate: VotingCandidate): string {
  return candidate.coPresenter
    ? `${candidate.presenter} & ${candidate.coPresenter}`
    : candidate.presenter;
}

function candidatePhotos(candidate: VotingCandidate): string[] {
  return [candidate.photo, candidate.coPresenterPhoto].filter(
    (photo): photo is string => Boolean(photo)
  );
}

export function VoteSkeleton() {
  return (
    <div
      className="vote-skeleton reg-skeleton-pulse"
      role="status"
      aria-busy="true"
      aria-label="Loading voting"
    >
      <span className="sr-only">Loading voting</span>
      <div className="vote-skeleton-status" aria-hidden="true" />
      <div className="vote-skeleton-grid" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="vote-skeleton-card" key={index} />
        ))}
      </div>
    </div>
  );
}

export function VotePageContent() {
  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "true";

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { status, liveResults, loading: settingsLoading } = useVotingSettings();

  // Admin preview: ?preview=true renders the ballot even while the public
  // status is not open, but only for a signed-in session — the same gate the
  // registration form preview uses. The session is checked here rather than
  // trusted from the URL, so a shared link cannot open a ballot for the public.
  const [sessionState, setSessionState] = useState<
    "unknown" | "signed-in" | "signed-out"
  >(() => (isPreviewParam ? "unknown" : "signed-out"));

  useEffect(() => {
    if (!isPreviewParam || !isSupabaseConfigured) return;
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        setSessionState(data.session ? "signed-in" : "signed-out");
      });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSessionState(session ? "signed-in" : "signed-out");
      });
      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Degrade to the public page instead of leaving the skeleton up. The
      // microtask keeps this out of the effect's synchronous body.
      Promise.resolve().then(() => setSessionState("signed-out"));
    }
  }, [isPreviewParam]);

  const previewActive = isPreviewParam && sessionState === "signed-in";
  const sessionPending =
    isPreviewParam && isSupabaseConfigured && sessionState === "unknown";
  // The preview shows the ballot as it looks while voting is open. The public
  // status still drives the banner, so the admin can see what is live now.
  const effectiveStatus = previewActive ? "open" : status;

  const [storedVote, setStoredVote] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(VOTE_STORAGE_KEY);
      return saved &&
        votingCandidates.some((candidate) => candidate.id === saved)
        ? saved
        : null;
    } catch {
      return null;
    }
  });
  const [results, setResults] = useState<VotingResults | null | undefined>(
    undefined
  );
  const [resultsVersion, setResultsVersion] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sendingRef = useRef(false);

  const dialogTitleId = useId();
  const emailId = useId();
  const noteId = useId();
  const errorId = useId();

  const resultsVisible =
    effectiveStatus === "closed" ||
    (effectiveStatus === "open" && liveResults);
  const selected = selectedId
    ? votingCandidates.find((candidate) => candidate.id === selectedId) ?? null
    : null;

  // Cosmetic only: the server decides whether a number has voted. A stored id
  // lets this browser mark the chosen card and disable the others. It is read
  // in the state initializer above; this effect only drops ids that no longer
  // match a candidate.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VOTE_STORAGE_KEY);
      if (
        saved &&
        !votingCandidates.some((candidate) => candidate.id === saved)
      ) {
        localStorage.removeItem(VOTE_STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Results are only requested when the public is allowed to see them. The
  // setState calls happen after the await, so this stays a subscription-style
  // effect rather than a cascade.
  useEffect(() => {
    if (!mounted || !resultsVisible) return;

    let active = true;
    (async () => {
      const next = await fetchVotingResults();
      if (active) setResults(next);
    })();

    return () => {
      active = false;
    };
  }, [mounted, resultsVisible, resultsVersion]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selected) return;
    if (!dialog.open) {
      dialog.showModal();
      emailRef.current?.focus();
    }
  }, [selected]);

  const refreshResults = useCallback(() => {
    setResults(undefined);
    setResultsVersion((version) => version + 1);
  }, []);

  const revalidateResults = useCallback(() => {
    setResultsVersion((version) => version + 1);
  }, []);

  function openDialog(
    candidate: VotingCandidate,
    trigger: HTMLButtonElement
  ): void {
    triggerRef.current = trigger;
    setEmail("");
    setError(null);
    setSelectedId(candidate.id);
  }

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  function handleDialogClose(): void {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    setSelectedId(null);
    setEmail("");
    setError(null);
    setSending(false);
    sendingRef.current = false;
    // Native <dialog> normally restores focus itself; this makes the return
    // deterministic in browsers that do not.
    window.setTimeout(() => trigger?.focus(), 0);
  }

  function handleDialogClick(
    event: React.MouseEvent<HTMLDialogElement>
  ): void {
    if (sending || event.target !== dialogRef.current) return;
    closeDialog();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    if (sendingRef.current || !selected) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(mapVoteResult("invalid"));
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);

    try {
      const code = await castVote(selected.id, normalizedEmail);

      if (code === "ok") {
        try {
          localStorage.setItem(VOTE_STORAGE_KEY, selected.id);
        } catch {}
        setStoredVote(selected.id);
        if (resultsVisible) revalidateResults();
        closeDialog();
      } else {
        setError(mapVoteResult(code));
      }
    } catch {
      setError(
        "We couldn't reach the server. Check your connection and try again."
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (!mounted || settingsLoading || sessionPending) {
    return <VoteSkeleton />;
  }

  if (votingCandidates.length === 0) {
    return (
      <section className="vote-content">
        <p className="vote-empty">Candidates will be announced.</p>
      </section>
    );
  }

  const total = results?.total ?? 0;
  const votesById = new Map(
    (results?.candidates ?? []).map((candidate) => [
      candidate.id,
      candidate.votes,
    ])
  );
  const { winners } = getVoteWinners(results?.candidates ?? []);

  let statusText: string;
  if (effectiveStatus === "soon") {
    statusText = "Voting opens during the conference.";
  } else if (effectiveStatus === "closed") {
    statusText = "Voting has closed. Thank you to everyone who took part.";
  } else if (storedVote) {
    statusText = liveResults
      ? "Your vote is in. Live results are shown below."
      : "Your vote is in. Results are announced when voting closes.";
  } else if (liveResults) {
    statusText = "Voting is open. Live results are shown below.";
  } else {
    statusText = "Voting is open. Choose one presentation.";
  }

  return (
    <section className="vote-content">
      {previewActive && (
        <aside
          className="admin-preview-banner"
          role="status"
          aria-label="Admin preview mode"
        >
          <div className="admin-preview-banner-text">
            <strong>Admin Vote Preview</strong>
            <span>
              The public status is currently:{" "}
              <strong className="preview-status-tag">{status}</strong> — votes
              cast in preview are real votes.
            </span>
          </div>
          <Link href="/admin#admin-voting" className="admin-preview-back-link">
            Return to admin
          </Link>
        </aside>
      )}

      <p className="vote-status" aria-live="polite">
        {statusText}
      </p>

      {resultsVisible && results && (
        <p className="vote-total">
          {total} {total === 1 ? "vote" : "votes"} cast
        </p>
      )}

      {resultsVisible && results === undefined && (
        <p className="vote-total">Counting votes…</p>
      )}

      {resultsVisible && results === null && (
        <p className="vote-status">
          Results are unavailable right now.{" "}
          <button type="button" className="vote-retry" onClick={refreshResults}>
            Try again
          </button>
        </p>
      )}

      <ul className="vote-grid">
        {votingCandidates.map((candidate) => {
          const votes = votesById.get(candidate.id) ?? 0;
          const percentage = getVotePercentage(votes, total);
          const isWinner =
            effectiveStatus === "closed" && winners.includes(candidate.id);
          const isStored = storedVote === candidate.id;
          const photos = candidatePhotos(candidate);
          const meta = [candidate.university, candidate.academicYear]
            .filter(Boolean)
            .join(" · ");
          const names = presenterNames(candidate);

          return (
            <li key={candidate.id} className="vote-grid-item">
              <article
                className={`vote-card${isWinner ? " vote-card--winner" : ""}`}
              >
                <div className="vote-card-stage">
                  <CompassRose />
                  {photos.length > 0 ? (
                    <div
                      className={`vote-card-figures${
                        photos.length > 1 ? " vote-card-figures--pair" : ""
                      }`}
                    >
                      {photos.map((photo, index) => {
                        // Per-photo framing nudge from the candidate data; the
                        // pair card also scales each cut-out (see CSS).
                        const shift =
                          index === 0
                            ? candidate.photoShift
                            : candidate.coPresenterShift;
                        return (
                          <div className="vote-card-figure" key={photo}>
                            <Image
                              src={photo}
                              alt=""
                              width={480}
                              height={480}
                              loading="lazy"
                              className="vote-card-photo"
                              style={
                                shift
                                  ? ({
                                      "--photo-shift": `${shift}%`,
                                    } as CSSProperties)
                                  : undefined
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="vote-card-initials">
                      <span
                        className="vote-card-initials-circle"
                        aria-hidden="true"
                      >
                        {getInitials(candidate.presenter)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="vote-card-body">
                  <p className="vote-card-presenter">{names}</p>
                  {meta && <p className="vote-card-meta">{meta}</p>}
                  <h2 className="vote-card-title">{candidate.title}</h2>
                  {candidate.summary && (
                    <p className="vote-card-summary">{candidate.summary}</p>
                  )}

                  <div className="vote-card-actions">
                    {isWinner && (
                      <p className="vote-winner">
                        <TrophyIcon size={14} weight="fill" aria-hidden="true" />
                        Winner
                      </p>
                    )}

                    {resultsVisible && results && (
                      <div className="vote-result">
                        <div className="vote-result-row">
                          <span>
                            {votes} {votes === 1 ? "vote" : "votes"}
                          </span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="vote-bar" aria-hidden="true">
                          <span style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )}

                    {effectiveStatus === "open" &&
                      (isStored ? (
                        <p className="vote-card-marker">Your vote</p>
                      ) : (
                        <button
                          type="button"
                          className="button vote-button"
                          disabled={Boolean(storedVote)}
                          aria-label={`Vote for ${candidate.title} by ${names}`}
                          onClick={(event) =>
                            openDialog(candidate, event.currentTarget)
                          }
                        >
                          Vote
                        </button>
                      ))}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        className="vote-dialog"
        aria-labelledby={dialogTitleId}
        onClose={handleDialogClose}
        onClick={handleDialogClick}
        onCancel={(event) => {
          if (sending) event.preventDefault();
        }}
      >
        {selected && (
          <div className="vote-dialog-inner">
            <button
              type="button"
              className="vote-dialog-close"
              aria-label="Close"
              onClick={closeDialog}
              disabled={sending}
            >
              <XIcon size={18} aria-hidden="true" />
            </button>

            <p className="vote-dialog-label">Your vote</p>
            <h2 id={dialogTitleId} className="vote-dialog-title">
              {selected.title}
            </h2>
            <p className="vote-dialog-presenter">
              By {presenterNames(selected)}
            </p>

            <form className="vote-dialog-form" onSubmit={handleSubmit}>
              <label htmlFor={emailId}>Email address</label>
              <div className="vote-email-row">
                <input
                  id={emailId}
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  disabled={sending}
                  aria-describedby={error ? `${noteId} ${errorId}` : noteId}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>
              <p id={noteId} className="vote-dialog-note">
                Use the email that had the attendance QR sent to. Votes can&apos;t be changed.
              </p>

              {error && (
                <p id={errorId} className="vote-dialog-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="button vote-dialog-submit"
                disabled={sending}
              >
                {sending ? "Sending…" : "Confirm my vote"}
              </button>
            </form>
          </div>
        )}
      </dialog>
    </section>
  );
}
