import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMPASS | Directing the Future of Healthcare",
  description: "Conference of Medical Practice and Scientific Studies at Beni Suef National University.",
  icons: { icon: "/tab-compass.png", apple: "/tab-compass.png" },
  // Required so og:/twitter: image URLs render as absolute URLs in previews
  metadataBase: new URL("https://compass.bsnu.workers.dev"),
  openGraph: {
    title: "COMPASS | Directing the Future of Healthcare",
    description: "Conference of Medical Practice and Scientific Studies at Beni Suef National University.",
    url: "https://compass.bsnu.workers.dev",
    siteName: "COMPASS",
    images: [{ url: "/compass-banner.jpg", width: 1280, height: 853 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "COMPASS | Directing the Future of Healthcare",
    description: "Conference of Medical Practice and Scientific Studies at Beni Suef National University.",
    images: ["/compass-banner.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js');try{var t=localStorage.getItem('compass-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}` }} /></head><body><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /><ScrollReveal /></body></html>;
}
