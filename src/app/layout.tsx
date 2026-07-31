import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = "https://tastestack.vercel.app";
const description =
  "Track anime, manga, movies, TV shows, games, music and books in one place. Rate, review, and build a public taste profile you can share.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TasteStack — Track everything you love",
    template: "%s | TasteStack",
  },
  description,
  keywords: [
    "media tracker",
    "anime tracker",
    "manga tracker",
    "book tracker",
    "movie tracker",
    "TV show tracker",
    "game tracker",
    "music tracker",
    "Letterboxd alternative",
    "MyAnimeList alternative",
    "taste profile",
  ],
  applicationName: "TasteStack",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: siteUrl },
  icons: { icon: "/logo.svg", shortcut: "/logo.svg", apple: "/logo.svg" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TasteStack",
    title: "TasteStack — Track everything you love",
    description,
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "TasteStack" }],
  },
  twitter: {
    card: "summary",
    title: "TasteStack — Track everything you love",
    description,
    images: ["/logo.svg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TasteStack",
  url: siteUrl,
  description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
