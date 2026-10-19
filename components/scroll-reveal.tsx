"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll-triggered reveal. Elements marked with the `reveal` class start
 * hidden (opacity 0 / translateY(16px), gated behind the `js` html class set
 * by the inline script in app/layout.tsx) and receive `reveal-visible` the
 * first time ~12% of them enters the viewport. Once revealed they stay
 * revealed. Re-scans on every client navigation and DOM mutation so dynamically
 * mounted targets (e.g. status changes, modals, expanded sections) are always picked up.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>(".reveal:not(.reveal-visible)").forEach((el) => {
        el.classList.add("reveal-visible");
      });
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

    const observeNewTargets = () => {
      const targets = document.querySelectorAll<HTMLElement>(".reveal:not(.reveal-visible)");
      targets.forEach((el) => observer.observe(el));
    };

    observeNewTargets();

    let mutObserver: MutationObserver | null = null;
    if ("MutationObserver" in window && document.body) {
      mutObserver = new MutationObserver(() => {
        observeNewTargets();
      });
      mutObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      if (mutObserver) mutObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
