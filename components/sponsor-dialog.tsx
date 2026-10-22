"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  FacebookLogo,
  InstagramLogo,
  WhatsappLogo,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { Sponsor, SponsorLinkKind } from "@/lib/sponsors";

interface SponsorDialogProps {
  sponsor: Sponsor | null;
  onClose: () => void;
}

const LINK_LABELS: Record<SponsorLinkKind, { en: string; ar: string; platform: string }> = {
  facebook: { en: "Facebook", ar: "فيسبوك", platform: "Facebook" },
  instagram: { en: "Instagram", ar: "إنستغرام", platform: "Instagram" },
  whatsapp: { en: "WhatsApp", ar: "واتساب", platform: "WhatsApp" },
  email: { en: "Email", ar: "البريد", platform: "Email" },
};

function renderLinkIcon(kind: SponsorLinkKind) {
  const size = 20;
  switch (kind) {
    case "facebook":
      return <FacebookLogo size={size} aria-hidden="true" />;
    case "instagram":
      return <InstagramLogo size={size} aria-hidden="true" />;
    case "whatsapp":
      return <WhatsappLogo size={size} aria-hidden="true" />;
    case "email":
      return <EnvelopeSimple size={size} aria-hidden="true" />;
  }
}

export function SponsorDialog({ sponsor, onClose }: SponsorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const [activeTab, setActiveTab] = useState<"en" | "ar">(() => {
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ar")) {
      return "ar";
    }
    return "en";
  });
  const currentSponsorId = sponsor ? sponsor.id : null;
  const [prevSponsorId, setPrevSponsorId] = useState<string | null>(null);

  if (currentSponsorId !== prevSponsorId) {
    setPrevSponsorId(currentSponsorId);
    if (sponsor) {
      const isArabic =
        typeof navigator !== "undefined" &&
        navigator.language?.toLowerCase().startsWith("ar");
      setActiveTab(isArabic ? "ar" : "en");
    }
  }

  // Track opener focus and open/close native modal
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (sponsor) {
      openerRef.current = document.activeElement as HTMLElement | null;

      if (!dialog.open) {
        dialog.showModal();
      }
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = "";
      openerRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sponsor]);

  // Click on backdrop to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const handleKeyDownTab = (e: React.KeyboardEvent<HTMLButtonElement>, current: "en" | "ar") => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextTab = current === "en" ? "ar" : "en";
      setActiveTab(nextTab);
      const targetId = nextTab === "en" ? "sponsor-tab-en" : "sponsor-tab-ar";
      document.getElementById(targetId)?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab("en");
      document.getElementById("sponsor-tab-en")?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab("ar");
      document.getElementById("sponsor-tab-ar")?.focus();
    }
  };

  if (!sponsor || !sponsor.details) {
    return (
      <dialog
        ref={dialogRef}
        className="sponsor-dialog"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
    );
  }

  const localeDetails = sponsor.details[activeTab];
  const isRtl = activeTab === "ar";
  const tierLabel = `${sponsor.tier.toUpperCase()} PARTNER`;

  return (
    <dialog
      ref={dialogRef}
      className="sponsor-dialog"
      aria-labelledby="sponsor-dialog-title"
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="sponsor-dialog-inner">
        {/* Header band: constant navy with logo, tier label, close button */}
        <header className="sponsor-dialog-header">
          <div className="sponsor-dialog-brand">
            <div className="sponsor-dialog-logo-box">
              <Image
                src={sponsor.logo.src}
                alt={sponsor.logo.alt}
                width={sponsor.logo.width}
                height={sponsor.logo.height}
                className="sponsor-dialog-logo"
              />
            </div>
            <span className="sponsor-dialog-tier">{tierLabel}</span>
          </div>
          <button
            type="button"
            className="sponsor-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Dialog body: follows light/dark theme tokens */}
        <div className="sponsor-dialog-body">
          {/* Language tabs: underlined text, never pills */}
          <div
            className="sponsor-dialog-tabs"
            role="tablist"
            aria-label="Language selection"
          >
            <button
              id="sponsor-tab-en"
              type="button"
              role="tab"
              aria-selected={activeTab === "en"}
              aria-controls="sponsor-tabpanel"
              tabIndex={activeTab === "en" ? 0 : -1}
              className={`sponsor-dialog-tab ${activeTab === "en" ? "sponsor-dialog-tab-active" : ""}`}
              onClick={() => setActiveTab("en")}
              onKeyDown={(e) => handleKeyDownTab(e, "en")}
            >
              English
            </button>
            <button
              id="sponsor-tab-ar"
              type="button"
              role="tab"
              aria-selected={activeTab === "ar"}
              aria-controls="sponsor-tabpanel"
              tabIndex={activeTab === "ar" ? 0 : -1}
              className={`sponsor-dialog-tab ${activeTab === "ar" ? "sponsor-dialog-tab-active" : ""}`}
              onClick={() => setActiveTab("ar")}
              onKeyDown={(e) => handleKeyDownTab(e, "ar")}
            >
              العربية
            </button>
          </div>

          {/* Tabpanel content */}
          <div
            id="sponsor-tabpanel"
            role="tabpanel"
            aria-labelledby={activeTab === "en" ? "sponsor-tab-en" : "sponsor-tab-ar"}
            dir={isRtl ? "rtl" : "ltr"}
            lang={activeTab}
            className="sponsor-dialog-panel"
          >
            <h2 id="sponsor-dialog-title" className="sponsor-dialog-title">
              {localeDetails.title}
            </h2>
            <p className="sponsor-dialog-intro">{localeDetails.intro}</p>

            <ul className="sponsor-dialog-items">
              {localeDetails.items.map((item, idx) => (
                <li key={idx} className="sponsor-dialog-item">
                  <span className="sponsor-dialog-dot" aria-hidden="true" />
                  <div className="sponsor-dialog-item-text">
                    <strong className="sponsor-dialog-lead">{item.lead}</strong>{" "}
                    <span className="sponsor-dialog-desc">{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer row: icon links with visible labels */}
          {sponsor.links && sponsor.links.length > 0 ? (
            <footer
              className="sponsor-dialog-footer"
              dir={isRtl ? "rtl" : "ltr"}
              lang={activeTab}
            >
              {sponsor.links.map((link) => {
                const labelObj = LINK_LABELS[link.kind];
                const visibleLabel = isRtl ? labelObj.ar : labelObj.en;
                const ariaLabel = `${sponsor.name} on ${labelObj.platform}`;
                const isExternal = link.kind !== "email";

                return (
                  <a
                    key={link.kind}
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    aria-label={ariaLabel}
                    className="sponsor-dialog-link hover-lift"
                  >
                    {renderLinkIcon(link.kind)}
                    <span>{visibleLabel}</span>
                  </a>
                );
              })}
            </footer>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
