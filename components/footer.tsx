"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FacebookLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import { sponsors } from "@/lib/sponsors";
import {
  SPONSOR_LINK_META,
  isSponsorLinkExternal,
  sponsorLinkAriaLabel,
} from "@/lib/sponsor-links";
import { SponsorDialog } from "@/components/sponsor-dialog";

export function Footer() {
  const [isOpen, setIsOpen] = useState(false);
  const moodDigital = sponsors.find((s) => s.id === "mood-digital") ?? null;

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Link href="/" className="footer-brand" aria-label="COMPASS home">
            <Image
              src="/compass-logo.png"
              alt="COMPASS"
              width={1100}
              height={192}
              className="brand-logo brand-logo-footer"
            />
          </Link>
          <p>Directing the Future of Healthcare.</p>
          <span className="footer-small">A student-led medical conference at BSNU.</span>
        </div>
        <div className="institution-marks">
          <div className="institution-slot hover-lift">
            <Image
              src="/bsnu-logo.png"
              alt="Beni Suef National University seal"
              width={1085}
              height={1078}
              className="seal-logo"
            />
            <span>
              Beni Suef<br />National University
            </span>
          </div>
          <div className="institution-slot hover-lift">
            <Image
              src="/fms-logo.png"
              alt="Faculty of Medicine and Surgery seal"
              width={1082}
              height={1078}
              className="seal-logo"
            />
            <span>Faculty of Medicine</span>
          </div>
        </div>
      </div>
      <div className="social-links">
        <div className="institution-slot">
          <span>
            Beni Suef<br />National University
          </span>
          <a
            href="https://www.facebook.com/share/1CLMS28whQ/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Beni Suef National University on Facebook"
            className="hover-lift"
          >
            <FacebookLogo size={22} aria-hidden="true" />
          </a>
        </div>
        <div className="institution-slot">
          <span>Faculty of Medicine</span>
          <a
            href="https://www.facebook.com/share/18ymt75c2C/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Faculty of Medicine and Surgery on Facebook"
            className="hover-lift"
          >
            <FacebookLogo size={22} aria-hidden="true" />
          </a>
          <a
            href="https://www.tiktok.com/@bsnu.medvibes"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Faculty of Medicine and Surgery on TikTok"
            className="hover-lift"
          >
            <TiktokLogo size={22} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="credit-bar">
        <div className="credit-inner">
          <div className="credit-text">
            <p>
              © Website developed by <strong>Mood Digital</strong>, led by Founder{" "}
              <strong>Mahmoud Ahmed Abdallah</strong> · Fourth-year student at the Faculty of
              Medicine, Beni Suef National University · All rights reserved.
            </p>
            <span className="credit-contact">
              Contact us:{" "}
              {moodDigital?.links?.length ? (
                <span className="credit-contact-links">
                  {moodDigital.links.map((link) => {
                    const isExternal = isSponsorLinkExternal(link.kind);
                    const { icon: Icon, name } = SPONSOR_LINK_META[link.kind];
                    return (
                      <a
                        key={link.kind}
                        href={link.href}
                        className="credit-contact-link hover-lift"
                        aria-label={sponsorLinkAriaLabel(moodDigital, link.kind, name)}
                        {...(isExternal
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span className="credit-contact-label">{name}</span>
                      </a>
                    );
                  })}
                </span>
              ) : null}
            </span>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label="About Mood Digital"
            className="credit-logo-btn hover-lift"
            onClick={() => setIsOpen(true)}
          >
            <Image
              src="/mood-digital-logo.png"
              alt=""
              width={487}
              height={513}
              className="credit-logo"
            />
          </button>
        </div>
      </div>
      <SponsorDialog sponsor={isOpen ? moodDigital : null} onClose={() => setIsOpen(false)} />
    </footer>
  );
}
