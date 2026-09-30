"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ANNOUNCEMENT_COLUMNS,
  CATEGORY_LABELS,
  announcementHref,
  formatAnnouncementDate,
  isAnnouncementRtl,
  type Announcement,
} from "@/lib/announcements";

// How many announcements are shown before "show more" is offered.
const COLLAPSED_COUNT = 2;

/**
 * Homepage announcements, rendered immediately after the hero.
 *
 * Fetched from Supabase on mount rather than baked in at build time — the site
 * is a static export, so there is no server to re-render on publish. An admin
 * posting from /admin changes what visitors see on their next page load, with
 * no rebuild. The trade-off is that announcements are absent from the static
 * HTML, so this is a progressive enhancement: with JS off, or with Supabase
 * unreachable, the section renders nothing and the page is otherwise complete.
 */
export function Announcements() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Unconfigured builds (missing env vars) simply show nothing.
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    // Failures are deliberately swallowed into the empty state: an
    // announcements outage must never take the rest of the homepage down.
    // Written as an async IIFE rather than .then().catch() because the
    // PostgrestBuilder is a PromiseLike, which has no .catch method.
    (async () => {
      const { data, error } = await getSupabase()
        .from("announcements")
        .select(ANNOUNCEMENT_COLUMNS)
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("announcements: fetch failed —", error.message);
        setItems([]);
        return;
      }
      setItems((data as Announcement[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reuse the site's reveal-on-scroll look, but observe the list ourselves.
  // components/scroll-reveal.tsx only re-scans on route change, so items that
  // arrive after hydration (i.e. always, here) would otherwise never be picked
  // up and would stay at opacity 0 forever. Same 12% threshold, add-once
  // behaviour, same classes — so this stays visually identical to every other
  // section, and reduced-motion/print overrides in globals.css still apply.
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    // Scoped to the WHOLE SECTION, not the list: the "Announcements" heading
    // carries .reveal but is a sibling of the list, so observing the list alone
    // would leave the heading stuck at opacity 0 and invisible.
    const targets = root.querySelectorAll<HTMLElement>(".reveal:not(.reveal-visible)");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("reveal-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // Depends on [items] only. Items appended by "Show more" carry no .reveal
    // class (see the note in the markup), so expanding mounts nothing this
    // observer needs to see. If a reveal class is ever added back to those
    // items, `expanded` MUST be added here too or they will mount at opacity 0.
  }, [items]);

  // Loading: a few shimmering placeholder rows so the section does not pop in.
  if (items === null) {
    return (
      <section className="announcements" aria-label="Announcements" aria-busy="true">
        <div className="announcements-list">
          {[0, 1].map((i) => (
            <div className="announcement announcement-skeleton" key={i} aria-hidden="true">
              <span className="announcement-meta skeleton-line skeleton-meta" />
              <span className="skeleton-line skeleton-title" />
              <span className="skeleton-line skeleton-body" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Zero published announcements: render no section at all, not an empty one.
  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hidden = items.length - visible.length;

  return (
    <section className="announcements" aria-labelledby="announcements-heading" ref={sectionRef}>
      <h2 className="announcements-heading reveal" id="announcements-heading">Announcements</h2>
      <div className="announcements-list">
        {visible.map((item, index) => {
          const href = announcementHref(item);
          const date = formatAnnouncementDate(item.created_at);
          const meta = [CATEGORY_LABELS[item.category], date].filter(Boolean).join(" · ");
          return (
            <article
              /* Items appended by "Show more" deliberately skip the reveal
                 class: they are revealed by a CLICK while already in view, not
                 by scrolling, so the scroll-reveal fade (and its 80ms stagger)
                 reads as lag on an explicit user action. The initially visible
                 items keep it, since those genuinely do arrive via scrolling.
                 Skipping the class also means the observer has nothing to do on
                 expand, so `expanded` no longer needs to be a dependency. */
              className={index < COLLAPSED_COUNT ? "announcement reveal" : "announcement"}
              key={item.id}
              dir={isAnnouncementRtl(item) ? "rtl" : "ltr"}
              style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
            >
              <div className="announcement-copy">
                <p className="announcement-meta">{meta}</p>
                <h3 className="announcement-title">{item.title}</h3>
                <p className="announcement-body">{item.body}</p>
              </div>
              {href ? (
                /* A labelled link, not a bare arrow. The corner-arrow-only
                   affordance was too easy to miss, and a link with no text is
                   also worse for screen readers. "Learn more" mirrors the
                   existing "The program ->" text-link in the event strip above,
                   so it reads as part of the same site rather than a new
                   pattern. */
                <a
                  className="announcement-more"
                  href={href}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  Learn more
                  <ArrowRightIcon size={17} aria-hidden="true" />
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
      {hidden > 0 || expanded ? (
        <button type="button" className="announcements-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show more (${hidden})`}
        </button>
      ) : null}
    </section>
  );
}
