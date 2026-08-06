"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATALOG } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import CoverImage from "@/components/tastestack/CoverImage";

export default function LandingPage() {
  // Starts as the curated icon tiles (identical to before) and swaps in real
  // cover art from the same trending endpoints Discover uses, once it loads.
  // Same sources, same attribution already in the footer — nothing here is
  // fetched or displayed differently than in the rest of the product.
  const [covers, setCovers] = useState<string[]>(Array(8).fill(""));

  useEffect(() => {
    Promise.all([
      fetch("/api/trending?type=anime&sort=trending").then((r) => r.json()).catch(() => ({ results: [] })),
      fetch("/api/trending?type=manga&sort=trending").then((r) => r.json()).catch(() => ({ results: [] })),
      fetch("/api/trending?type=book&sort=trending").then((r) => r.json()).catch(() => ({ results: [] })),
    ]).then(([anime, manga, book]) => {
      const pool = [...(anime.results || []), ...(manga.results || []), ...(book.results || [])]
        .filter((r: { coverUrl?: string }) => r?.coverUrl)
        .map((r: { coverUrl: string }) => r.coverUrl);
      if (pool.length >= 6) setCovers(pool.slice(0, 8));
    }).catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden">
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute -top-24 right-[-8rem] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              YOUR TASTE, CONNECTED <span>✦</span>
            </div>
            <h1 className="mt-5 max-w-2xl text-5xl sm:text-6xl font-black tracking-[-0.055em] leading-[.95]">
              Everything you love.<br />
              <span className="text-primary">One living profile.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              TasteStack is your personal culture shelf. Track the anime you&apos;re watching, films you&apos;ve loved, games you&apos;ve finished, albums on repeat, and books still calling your name.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link href="/signup">Start your stack →</Link></Button>
              <Button variant="outline" size="lg" asChild><Link href="/discover">Explore picks</Link></Button>
            </div>
            <div className="mt-9 flex items-center gap-5 text-sm text-muted-foreground">
              <span><b className="text-foreground">7</b> media worlds</span>
              <span className="h-4 w-px bg-border" />
              <span><b className="text-foreground">1</b> shareable identity</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-7 rounded-[2rem] bg-primary/15 blur-2xl" />
            <div className="relative rotate-[2deg] rounded-3xl border bg-card p-5 shadow-2xl">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-violet-500 grid place-items-center text-lg font-bold text-primary-foreground">T</div>
                <div>
                  <p className="font-bold">your-taste-stack</p>
                  <p className="text-xs text-muted-foreground">A life in lists</p>
                </div>
                <span className="ml-auto rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-500">Public</span>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {CATALOG.slice(0, 8).map((item, i) => (
                  <div key={item.apiId} className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                    <CoverImage src={covers[i]} alt={item.title} icon={item.cover} accent={item.accent} sizes="80px" />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xl font-black">48</p><p className="text-xs text-muted-foreground">tracked</p></div>
                <div><p className="text-xl font-black">16</p><p className="text-xs text-muted-foreground">favourites</p></div>
                <div><p className="text-xl font-black">5</p><p className="text-xs text-muted-foreground">worlds</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[.18em] text-primary">DESIGNED FOR OBSESSIVES</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">A home for every rabbit hole.</h2>
          </div>
          <div className="mt-9 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["✦", "Anime & manga", "Your seasonal queue and all-time canon."],
              ["▶", "Film & television", "Keep a beautiful watch history."],
              ["♜", "Games", "Remember every world you stepped into."],
              ["♫", "Music & books", "Save the things that changed your week."],
            ].map(([icon, title, body]) => (
              <div key={title as string} className="rounded-xl border bg-card p-5">
                <div className="text-2xl text-primary">{icon}</div>
                <h3 className="mt-5 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 text-center">
        <p className="text-primary font-semibold text-sm">MAKE YOUR TASTE DISCOVERABLE</p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">The profile link you&apos;ll actually want to share.</h2>
        <p className="mt-4 mx-auto max-w-lg text-muted-foreground">
          Add a title, give it a score, mark your progress, and let your profile tell the story.
        </p>
        <Button size="lg" className="mt-8" asChild><Link href="/signup">Create a free profile</Link></Button>
      </section>
    </div>
  );
}
