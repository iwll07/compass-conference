import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CLOUDFLARE_ANALYTICS_TOKEN } from "@/lib/analytics";
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Render-blocking on purpose: sets the stored theme before first paint so dark-mode reloads don't flash. Verified by scripts/csp-check.mjs's no-flash assertion. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
        {/* Cloudflare Web Analytics. A PLAIN script tag on purpose: next/script
            would inject its own inline bootstrap block, which would need a CSP
            hash and would change per build. This form adds no inline script.
            Token is public by design — see lib/analytics.ts. */}
        <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN })} />
      </head>
      <body><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /><ScrollReveal /></body>
    </html>
  );
}
