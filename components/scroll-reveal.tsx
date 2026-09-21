"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll-triggered reveal. Elements marked with the `reveal` class start
 * hidden (opacity 0 / translateY(16px), gated behind the `js` html class set
 * by the inline script in app/layout.tsx) and receive `reveal-visible` the
 * first time ~12% of them enters the viewport. Once revealed they stay
 * revealed. Re-scans on every client navigation so each page's targets are
 * picked up. Reduced-motion users never see the hidden state (CSS override
 * in app/globals.css), and without JS content is never hidden at all.
 * Stagger via inline custom property: style={{ "--reveal-delay": "80ms" }}.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal:not(.reveal-visible)");
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
  }, [pathname]);

  return null;
}
