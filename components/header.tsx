"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ListIcon, XIcon, ArrowUpRightIcon } from "@phosphor-icons/react";
import { ThemeToggle } from "./theme-toggle";

const links = [["/", "Home"], ["/about", "About"], ["/agenda", "Agenda"], ["/speakers", "Speakers"], ["/posters", "Posters"], ["/sponsors", "Sponsors"]];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // trailingSlash:true makes usePathname() return "/about/" while links are "/about" — normalize before comparing
  const currentPath = pathname.replace(/\/+$/, "") || "/";
  return (
    <header className="site-header">
      <div className="institution-bar"><span>Faculty of Medicine</span><span>Beni Suef National University</span></div>
      <div className="nav-shell">
        <Link className="wordmark" href="/" aria-label="COMPASS home" onClick={() => setOpen(false)}><Image src="/compass-logo.png" alt="COMPASS" width={1100} height={192} className="brand-logo" priority /></Link>
        <nav aria-label="Main navigation" className="desktop-nav">{links.map(([href, label]) => <Link key={href} href={href} className="link-underline" aria-current={currentPath === href ? "page" : undefined}>{label}</Link>)}</nav>
        <div className="nav-actions"><ThemeToggle /><Link href="/registration" className="nav-register">Registration <ArrowUpRightIcon size={16} aria-hidden="true" /></Link><button className="icon-button menu-toggle" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}><span className={open ? "icon-swap icon-swap-alt" : "icon-swap"} aria-hidden="true"><ListIcon size={24} className="icon-base" /><XIcon size={24} className="icon-alt" /></span></button></div>
      </div>
      <nav id="mobile-nav" className={open ? "mobile-nav mobile-nav-open" : "mobile-nav"} aria-label="Mobile navigation" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus(); } }}>{[...links, ["/registration", "Registration"]].map(([href, label]) => <Link key={href} href={href} aria-current={currentPath === href ? "page" : undefined} onClick={() => setOpen(false)}><span className="link-underline">{label}</span><ArrowUpRightIcon size={18} aria-hidden="true" /></Link>)}</nav>
    </header>
  );
}
