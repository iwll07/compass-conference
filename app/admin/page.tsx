"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ANNOUNCEMENT_COLUMNS,
  CATEGORIES,
  CATEGORY_LABELS,
  PAGE_ROUTES,
  announcementHref,
  formatAnnouncementDate,
  isAnnouncementRtl,
  type Announcement,
  type AnnouncementCategory,
  type LinkTarget,
} from "@/lib/announcements";

/** The only account allowed to read the announcement audit log. Mirrors the
 *  `announcement_log` SELECT policy in supabase/migrations — keep in sync. */
export const HISTORY_EMAIL = "fares9005@gmail.com";

type HistoryEntry = {
  id: string;
  announcement_id: string;
  action: "created" | "updated" | "deleted";
  title: string;
  actor_email: string;
  created_at: string;
};

type AuthState = "loading" | "signed-out" | "signed-in";
// "custom-url" is a form-only sentinel; the stored value is "custom".
type LinkChoice = LinkTarget | "custom-url";

const EMPTY_FORM = { title: "", category: "general" as AnnouncementCategory, linkChoice: "none" as LinkChoice, customUrl: "", body: "" };

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  // Session email, used only to decide whether to show the history panel. RLS
  // is the real gate: a non-privileged user gets an empty result here regardless
  // of what this decides, so hiding the UI is presentation, not security.
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const canSeeHistory = sessionEmail?.toLowerCase() === HISTORY_EMAIL;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await getSupabase()
      .from("announcements")
      .select(ANNOUNCEMENT_COLUMNS)
      // The admin needs unpublished rows too, so no .eq("published", true) here.
      // This select only succeeds with a session — RLS, not this page, is the gate.
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setItems((data as Announcement[] | null) ?? []);
  }, []);

  const loadHistory = useCallback(async () => {
    // Returns no rows for anyone other than HISTORY_EMAIL: the SELECT policy
    // allows only that one verified email, so this is safe to call
    // unconditionally. Errors are swallowed to an empty list — a missing log
    // must not break the rest of the admin page.
    const { data, error } = await getSupabase()
      .from("announcement_log")
      .select("id,announcement_id,action,title,actor_email,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setHistory([]);
      return;
    }
    setHistory((data as HistoryEntry[] | null) ?? []);
  }, []);

  useEffect(() => {
    // No setState for the unconfigured case: that branch is returned from
    // before authState is ever read, so syncing it here would be a redundant
    // state update (and a cascading render) on every mount.
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let active = true;

    // getSession() (not getUser()) is correct for this page: it is purely
    // client-side with no server to verify the JWT against, so a stored session
    // check is all that is available. RLS is what actually gates every read and
    // write below — this only decides what the UI offers.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const signedIn = !!data.session;
      setAuthState(signedIn ? "signed-in" : "signed-out");
      setSessionEmail(signedIn ? (data.session?.user?.email ?? null) : null);
      if (signedIn) {
        load();
        loadHistory();
      }
    });

    // Keeps the UI honest if the session refreshes or expires in another tab.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthState(session ? "signed-in" : "signed-out");
      setSessionEmail(session ? (session.user?.email ?? null) : null);
      if (session) {
        load();
        loadHistory();
      } else {
        setItems([]);
        setHistory(null);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [load, loadHistory]);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (emailState === "sending") return;
    setEmailState("sending");
    setAuthError(null);
    const { error: err } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Trailing slash REQUIRED: the app is built with `trailingSlash: true`,
        // so /admin is canonical as /admin/ and Supabase would otherwise bounce
        // the token through a 308 before the page ever sees it.
        emailRedirectTo: `${window.location.origin}/admin/`,
        // Do not auto-provision accounts: only existing users can sign in, so
        // this form cannot be used to create accounts or probe which addresses
        // are registered.
        shouldCreateUser: false,
      },
    });
    // The confirmation is identical whether or not the address is an
    // allowlisted admin. Echoing Supabase's error here would leak exactly who
    // has access, so a failure still reports "check your email" and the real
    // reason goes to the console only.
    if (err) console.warn("signInWithOtp:", err.message);
    setEmailState("sent");
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    setAuthState("signed-out");
    setItems([]);
  }

  const formLinkTarget: LinkTarget = form.linkChoice === "custom-url" ? "custom" : form.linkChoice;
  // The preview mirrors exactly what the homepage will render, built from the
  // same helpers against the same uncommitted form state. No network call.
  const previewHref = useMemo(
    () => announcementHref({ link_target: formLinkTarget, custom_url: form.customUrl }),
    [formLinkTarget, form.customUrl]
  );
  const previewDate = useMemo(() => formatAnnouncementDate(new Date().toISOString()), []);
  // The preview mirrors the homepage exactly, including RTL: typing Arabic into
  // the form should show the same right-aligned, link-on-the-left result.
  const previewRtl = useMemo(
    () => isAnnouncementRtl({ title: form.title, body: form.body }),
    [form.title, form.body]
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    // A custom URL that is present but unusable is a silent data-loss footgun
    // (the row would save and render with no arrow), so refuse it up front.
    if (formLinkTarget === "custom" && !previewHref) {
      setError("That custom URL is not a valid http(s) link.");
      setSaving(false);
      return;
    }
    const { error: err } = await getSupabase().from("announcements").insert({
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      link_target: formLinkTarget,
      // custom_url is stored only for the 'custom' target and cleared for every
      // other option, so a stale URL can never outlive its selection.
      custom_url: formLinkTarget === "custom" ? form.customUrl.trim() : null,
      published: true,
    });
    setSaving(false);
    // A rejected insert is a real outcome (expired session, RLS), not an edge
    // case — surface it rather than letting it look like success.
    if (err) {
      setError(`Could not save: ${err.message}`);
      return;
    }
    setForm(EMPTY_FORM);
    setNotice("Announcement published.");
    load();
    // The audit trigger has already fired server-side, so re-reading here shows
    // the new entry immediately instead of on the next page load.
    loadHistory();
  }

  async function togglePublished(item: Announcement) {
    setError(null);
    const { error: err } = await getSupabase().from("announcements").update({ published: !item.published }).eq("id", item.id);
    if (err) {
      setError(`Could not update: ${err.message}`);
      return;
    }
    load();
    loadHistory();
  }

  async function remove(item: Announcement) {
    setError(null);
    const { error: err } = await getSupabase().from("announcements").delete().eq("id", item.id);
    if (err) {
      setError(`Could not delete: ${err.message}`);
      return;
    }
    load();
    loadHistory();
  }

  if (!isSupabaseConfigured) {
    return (
      <main id="main-content" className="page-shell">
        <h1>Admin</h1>
        <p className="empty-state">Supabase is not configured for this build.</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell admin-page">
      <div className="admin-head">
        <h1>Admin</h1>
        {authState === "signed-in" ? (
          <button type="button" className="button button-secondary admin-signout" onClick={signOut}>Sign out</button>
        ) : null}
      </div>

      {authState === "loading" ? <p className="admin-note">Checking your session…</p> : null}

      {authState === "signed-out" ? (
        <section className="admin-login" aria-labelledby="admin-login-heading">
          <h2 id="admin-login-heading">Sign in</h2>
          <p className="admin-note">Announcements are managed with a magic link sent to an authorised address.</p>
          {emailState === "sent" ? (
            <p className="admin-notice" role="status">If that address is authorised, check your email for the sign-in link.</p>
          ) : (
            <form className="admin-form" onSubmit={sendMagicLink}>
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <button type="submit" className="button" disabled={emailState === "sending"}>
                <span className="button-label">{emailState === "sending" ? "Sending…" : "Send magic link"}</span>
              </button>
            </form>
          )}
          {authError ? <p className="admin-error" role="alert">{authError}</p> : null}
        </section>
      ) : null}

      {authState === "signed-in" && sessionEmail ? (
        <p className="admin-note admin-signed-in">Signed in as {sessionEmail}</p>
      ) : null}

      {authState === "signed-in" ? (
        <>
          <section className="admin-new" aria-labelledby="admin-new-heading">
            <h2 id="admin-new-heading">New announcement</h2>
            <form className="admin-form" onSubmit={submit}>
              <label htmlFor="ann-title">Title</label>
              <input id="ann-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              <label htmlFor="ann-category">Category</label>
              <select id="ann-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AnnouncementCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>

              <label htmlFor="ann-link">Links to</label>
              <select
                id="ann-link"
                value={form.linkChoice}
                onChange={(e) => {
                  const choice = e.target.value as LinkChoice;
                  // Choosing a page or "No link" drops the custom URL so the
                  // stored row can never disagree with the selected target.
                  setForm({ ...form, linkChoice: choice, customUrl: choice === "custom-url" ? form.customUrl : "" });
                }}
              >
                {Object.entries(PAGE_ROUTES).map(([key, href]) => (
                  <option key={key} value={key}>{CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]} ({href})</option>
                ))}
                <option value="none">No link</option>
                <option value="custom-url">Paste a custom URL…</option>
              </select>

              {form.linkChoice === "custom-url" ? (
                <>
                  <label htmlFor="ann-custom-url">Custom URL</label>
                  <input
                    id="ann-custom-url"
                    type="url"
                    placeholder="https://example.com/announcement"
                    value={form.customUrl}
                    onChange={(e) => setForm({ ...form, customUrl: e.target.value })}
                  />
                </>
              ) : null}

              <label htmlFor="ann-body">Body</label>
              <textarea id="ann-body" required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />

              <button type="submit" className="button" disabled={saving}>
                <span className="button-label">{saving ? "Publishing…" : "Publish announcement"}</span>
              </button>
            </form>

            {/* Live preview: a pure render of the form's current state using the
                same helpers as the homepage, so it cannot drift from what will
                actually be published. */}
            <div className="admin-preview" aria-label="Preview">
              <p className="admin-preview-label">Preview</p>
              <h3 className="announcements-heading">Announcements</h3>
              <article className="announcement" dir={previewRtl ? "rtl" : "ltr"}>
                <div className="announcement-copy">
                  <p className="announcement-meta">
                    {[CATEGORY_LABELS[form.category], previewDate].filter(Boolean).join(" · ")}
                  </p>
                  <h3 className="announcement-title">{form.title || "Untitled announcement"}</h3>
                  <p className="announcement-body">{form.body || "One-line summary appears here."}</p>
                </div>
                {previewHref ? (
                  <a className="announcement-more" href={previewHref}>
                    Learn more
                    <ArrowRightIcon size={17} aria-hidden="true" />
                  </a>
                ) : null}
              </article>
            </div>
          </section>

          {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
          {error ? <p className="admin-error" role="alert">{error}</p> : null}

          <section className="admin-list" aria-labelledby="admin-list-heading">
            <h2 id="admin-list-heading">Existing announcements</h2>
            {items.length === 0 ? <p className="admin-note">Nothing here yet.</p> : null}
            <ul>
              {items.map((item) => {
                const href = announcementHref(item);
                return (
                  <li key={item.id}>
                    <div>
                      <p className="announcement-meta">
                        {[CATEGORY_LABELS[item.category], formatAnnouncementDate(item.created_at)].filter(Boolean).join(" · ")}
                      </p>
                      <h3 className="announcement-title">{item.title}</h3>
                      <p className="announcement-body">{item.body}</p>
                      {href ? (
                        <a className="admin-row-link" href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                          {href}
                        </a>
                      ) : null}
                    </div>
                    <div className="admin-row-actions">
                      <span className={item.published ? "admin-state admin-state-live" : "admin-state"}>{item.published ? "Published" : "Draft"}</span>
                      <button type="button" className="button button-secondary admin-row-button" onClick={() => togglePublished(item)}>
                        <span className="button-label">{item.published ? "Unpublish" : "Publish"}</span>
                      </button>
                      <button type="button" className="button button-secondary admin-row-button" onClick={() => remove(item)}>
                        <span className="button-label">Delete</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* History is rendered only for the privileged account. Hiding it is
              presentation, not security — the RLS policy on announcement_log is
              what actually withholds the rows from anyone else. */}
          {canSeeHistory ? (
            <section className="admin-list" aria-labelledby="admin-history-heading">
              <h2 id="admin-history-heading">History</h2>
              <p className="admin-note">Who changed what, most recent first. Recorded by a database trigger, so it also captures edits made directly in Supabase.</p>
              {history === null ? <p className="admin-note">Loading…</p> : null}
              {history !== null && history.length === 0 ? <p className="admin-note">No activity recorded yet.</p> : null}
              {history !== null && history.length > 0 ? (
                <ul>
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <p className="announcement-meta">
                          {[entry.action, formatAnnouncementDate(entry.created_at)].filter(Boolean).join(" · ")}
                        </p>
                        <h3 className="announcement-title">{entry.title}</h3>
                        <p className="announcement-body">{entry.actor_email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
