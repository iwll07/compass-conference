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
  return (
    <header className="site-header">
      <div className="institution-bar"><span>Faculty of Medicine and Surgery</span><span>Beni Suef National University</span></div>
      <div className="nav-shell">
        <Link className="wordmark" href="/" aria-label="COMPASS home" onClick={() => setOpen(false)}><Image src="/compass-logo.png" alt="COMPASS" width={1127} height={213} className="brand-logo" priority /></Link>
        <nav aria-label="Main navigation" className="desktop-nav">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
        <div className="nav-actions"><ThemeToggle /><Link href="/registration" className="nav-register">Registration <ArrowUpRightIcon size={16} aria-hidden="true" /></Link><button className="icon-button menu-toggle" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <XIcon size={24} /> : <ListIcon size={24} />}</button></div>
      </div>
      {open && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus(); } }}>{[...links, ["/registration", "Registration"]].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}<ArrowUpRightIcon size={18} aria-hidden="true" /></Link>)}</nav>}
    </header>
  );
}
