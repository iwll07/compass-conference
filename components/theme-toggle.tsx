"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

function subscribe(callback: () => void) {
  window.addEventListener("compass-theme", callback);
  window.addEventListener("storage", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("compass-theme", callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

function snapshot() {
  return document.documentElement.dataset.theme === "dark";
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("compass-theme", theme); } catch {}
    window.dispatchEvent(new Event("compass-theme"));
  }
  return <button className="icon-button" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>{dark ? <SunIcon size={21} aria-hidden="true" /> : <MoonIcon size={21} aria-hidden="true" />}</button>;
}
