import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Countdown } from "@/components/countdown";
import type { CSSProperties } from "react";

const stagger = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

export default function HomePage() {
  return <main id="main-content">
    <section className="hero hero-photo">
      <div className="hero-bg" aria-hidden="true" style={{ backgroundImage: "url(/college.jpeg)" }} />
      <div className="hero-copy"><h1 className="reveal">Directing the future of <em>healthcare.</em></h1><p className="reveal" style={stagger(80)}>A student-led meeting of medical practice, scientific inquiry, and the people who will shape what comes next.</p><div className="hero-actions reveal" style={stagger(160)}><Link className="button hover-lift" href="/registration">Registration <ArrowUpRightIcon size={19} aria-hidden="true" /></Link><Link className="text-link hero-link" href="/about">Discover COMPASS <ArrowRightIcon size={18} aria-hidden="true" /></Link></div><div className="hero-definition">Conference of Medical Practice<br />and Scientific Studies</div></div>
    </section>
    <section className="event-strip" aria-label="Conference details"><Countdown /><a className="event-place" href="https://maps.app.goo.gl/hGkvafW5MgV6WBia9" target="_blank" rel="noopener noreferrer" aria-label="Beni Suef National University on Google Maps"><strong>Beni Suef National University</strong><span>Faculty of Medicine and Surgery · Egypt</span></a><Link href="/agenda" className="text-link">The program <ArrowRightIcon size={18} aria-hidden="true" /></Link></section>
    <section className="home-intro"><div className="reveal"><h2>Good medicine starts<br />with good questions.</h2><span className="intro-rule" /></div><div className="intro-prose reveal" style={stagger(80)}><p className="lead">Between what we learn and how we care, there is a conversation worth having.</p><p>COMPASS brings medical practice and scientific studies into the same room. Built by students at BSNU, it is a place to ask better questions, share work, and find a direction of your own.</p><Link href="/about" className="text-link">Why we’re coming together <ArrowUpRightIcon size={18} aria-hidden="true" /></Link></div></section>
    <section className="explore-section"><div className="explore-heading reveal"><h2>More than<br />a seat in the room.</h2><p>A program taking shape around learning, exchange, and student research.</p></div><div className="explore-list"><Link href="/agenda" className="reveal" style={stagger(0)}><div><h3 className="link-underline">Follow the conversation</h3><p>Talks, sessions, and space for questions.</p></div><span className="explore-detail">The agenda<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link><Link href="/speakers" className="reveal" style={stagger(80)}><div><h3 className="link-underline">Meet the minds behind it</h3><p>Speakers, their work, and the ideas they’ll share.</p></div><span className="explore-detail">Speakers & guests<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link><Link href="/posters" className="reveal" style={stagger(160)}><div><h3 className="link-underline">Make room for new research</h3><p>Student questions deserve a wider audience.</p></div><span className="explore-detail">Student posters<ArrowUpRightIcon size={24} aria-hidden="true" /></span></Link></div></section>
    <section className="sponsor-strip reveal"><div><h2>Supported by shared ambition.</h2><p>Our conference partners will be announced here.</p></div><Link href="/sponsors" className="text-link">Sponsors & partners <ArrowUpRightIcon size={18} aria-hidden="true" /></Link></section>
  </main>;
}
