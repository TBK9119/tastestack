import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TasteStack — Track everything you love",
  description:
    "Track anime, movies, TV, games, music and books in one place. Build your public taste profile.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-ink-300">
        <Providers>
          <NavBar />
          <main className="min-h-[calc(100vh-60px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
