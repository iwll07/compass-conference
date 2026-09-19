import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMPASS | Directing the Future of Healthcare",
  description: "Conference of Medical Practice and Scientific Studies at Beni Suef National University.",
  icons: { icon: "/tab-compass.png", apple: "/tab-compass.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('compass-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}` }} /></head><body><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /></body></html>;
}
