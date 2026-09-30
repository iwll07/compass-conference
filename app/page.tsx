import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Countdown } from "@/components/countdown";
import { Announcements } from "@/components/announcements";
import { openCalls, lastConference } from "@/lib/calls";
import type { CSSProperties } from "react";

const stagger = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

export default function HomePage() {
  return <main id="main-content">
    <section className="hero hero-photo">
      {/* Hero photo is a real <img>, not a CSS background-image. The preload
          scanner only discovers images present in markup, so a background-image
          LCP element is not fetched until CSS is parsed and applied — that late
          discovery was the LCP bottleneck (4.5-5s on throttled connections).
          fetchPriority="high" and no loading="lazy" keep it out of lazy-loading.
          Decorative, so alt is empty and the wrapper stays aria-hidden. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a plain <img> is required here: next/image would emit its own wrapper and lazy-loading behaviour, and the goal is a single discoverable, high-priority image element. */}
      <div className="hero-bg" aria-hidden="true"><img src="/college.jpeg" alt="" width={800} height={533} fetchPriority="high" /></div>
      <div className="hero-copy"><h1 className="reveal">Directing the future of <em>healthcare.</em></h1><p className="reveal" style={stagger(80)}>Conference of Medical Practice and Scientific Studies</p><div className="hero-actions reveal" style={stagger(160)}><div className="hero-cta-row">{openCalls.map((call) => <a key={call.href} className="button hover-lift" href={call.href} target="_blank" rel="noopener noreferrer"><span className="button-label">{call.label}</span><ArrowUpRightIcon size={19} aria-hidden="true" /></a>)}</div><Link className="text-link hero-link" href="/about">Discover COMPASS <ArrowRightIcon size={18} aria-hidden="true" /></Link></div><div className="hero-definition">A student-led meeting of medical practice, scientific inquiry,<br />and the people who will shape what comes next.</div></div>
    </section>
    <section className="event-strip" aria-label="Conference details"><Countdown /><a className="event-place" href="https://maps.app.goo.gl/hGkvafW5MgV6WBia9" target="_blank" rel="noopener noreferrer" aria-label="Beni Suef National University on Google Maps"><strong className="event-place-name">Beni Suef National University<ArrowUpRightIcon size={13} aria-hidden="true" /></strong><span>Faculty of Medicine · Egypt</span></a><Link href="/agenda" className="text-link">The program <ArrowRightIcon size={18} aria-hidden="true" /></Link></section>
    {/* Announcements sit after the event strip (countdown + location), framed
        by hairlines above and below. */}
    <Announcements />
    <section className="home-intro"><div className="reveal"><h2>Good medicine starts<br />with good questions.</h2><span className="intro-rule" /></div><div className="intro-prose reveal" style={stagger(80)}><p className="lead">Between what we learn and how we care, there is a conversation worth having.</p><p>COMPASS brings medical practice and scientific studies into the same room. Built by students at BSNU, it is a place to ask better questions, share work, and find a direction of your own.</p><Link href="/about" className="text-link">Why we’re coming together <ArrowUpRightIcon size={18} aria-hidden="true" /></Link></div></section>
    <section className="explore-section"><div className="explore-heading reveal"><h2>More than<br />a seat in the room.</h2><p>A program taking shape around learning, exchange, and student research.</p></div><div className="explore-list"><Link href="/agenda" className="reveal" style={stagger(0)}><div><h3 className="link-underline">Follow the conversation</h3><p>Talks, sessions, and space for questions.</p></div><span className="explore-detail">The agenda<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link><Link href="/speakers" className="reveal" style={stagger(80)}><div><h3 className="link-underline">Meet the minds behind it</h3><p>Speakers, their work, and the ideas they’ll share.</p></div><span className="explore-detail">Speakers & guests<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link><Link href="/posters" className="reveal" style={stagger(160)}><div><h3 className="link-underline">Make room for new research</h3><p>Student questions deserve a wider audience.</p></div><span className="explore-detail">Student posters<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link></div></section>
    <section className="sponsor-strip reveal"><div><h2>Supported by shared ambition.</h2><p>Our conference partners will be announced here.</p></div><Link href="/sponsors" className="text-link">Sponsors & partners <ArrowUpRightIcon size={18} aria-hidden="true" /></Link></section>
    <section className="last-conference reveal" aria-labelledby="last-conference-heading">
      <div className="last-conference-copy"><h2 id="last-conference-heading">Check out our last conference</h2><p>A look back at IMPACT — the speakers, the sessions, and the room it filled.</p></div>
      <div className="last-conference-media">
        <a className="impact-logo hover-lift" href={lastConference.site} target="_blank" rel="noopener noreferrer" aria-label="Visit the IMPACT 2025 conference site">
          <Image src="/Impact-logo.png" alt="IMPACT — last year's COMPASS conference" width={845} height={206} />
          <ArrowUpRightIcon size={16} aria-hidden="true" />
        </a>
        <a className="button hover-lift" href={lastConference.highlights} target="_blank" rel="noopener noreferrer">
          Relive the moment
          <ArrowUpRightIcon size={19} aria-hidden="true" />
        </a>
      </div>
    </section>
  </main>;
}
