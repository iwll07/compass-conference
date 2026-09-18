import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";

export function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div><Link href="/" className="footer-brand" aria-label="COMPASS home"><Image src="/compass-logo.png" alt="COMPASS" width={1127} height={213} className="brand-logo brand-logo-footer" /></Link><p>Directing the Future of Healthcare.</p><span className="footer-small">A student-led medical conference at BSNU.</span></div><div className="institution-marks"><div className="institution-slot"><Image src="/bsnu-logo.png" alt="Beni Suef National University seal" width={497} height={502} className="seal-logo" /><span>Beni Suef<br />National University</span></div><div className="institution-slot"><Image src="/fms-logo.png" alt="Faculty of Medicine and Surgery seal" width={503} height={496} className="seal-logo" /><span>Faculty of Medicine<br />and Surgery</span></div></div></div><div className="footer-bottom"><span>Conference of Medical Practice and Scientific Studies</span><Link href="/about">Meet the idea behind COMPASS <ArrowUpRightIcon size={15} aria-hidden="true" /></Link></div></footer>;
}
