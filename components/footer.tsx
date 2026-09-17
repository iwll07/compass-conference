import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";

export function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div><Link href="/" className="footer-brand">COMPASS</Link><p>Directing the Future of Healthcare.</p><span className="footer-small">A student-led medical conference at BSNU.</span></div><div className="institution-marks"><div className="institution-slot"><span className="seal-placeholder" aria-hidden="true">BSNU</span><span>Beni Suef<br />National University<small>University mark forthcoming</small></span></div><div className="institution-slot"><span className="seal-placeholder" aria-hidden="true">FMS</span><span>Faculty of Medicine<br />and Surgery<small>Faculty mark forthcoming</small></span></div></div></div><div className="footer-bottom"><span>Conference of Medical Practice and Scientific Studies</span><Link href="/about">Meet the idea behind COMPASS <ArrowUpRightIcon size={15} aria-hidden="true" /></Link></div></footer>;
}
