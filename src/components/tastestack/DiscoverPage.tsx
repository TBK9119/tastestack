"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { CATALOG } from "@/lib/catalog";
import { MEDIA_TYPES, TYPE_ICONS, type MediaType, mediaConfig } from "@/lib/constants";
import type { NormalizedResult } from "@/lib/api/anilist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Card = {
  key: string; type: MediaType; apiId: string; source?: string;
  title: string; creator: string; year: string; progressTotal: number;
  description: string; cover?: string; accent?: string; coverUrl?: string;
};

const TABS: Array<"all" | MediaType> = ["all", "anime", "manga", "movie", "tv", "game", "album", "book"];

export default function DiscoverPage() {
  const { data: session } = useSession();
  const { setView, user } = useAppStore();
  const [type, setType] = useState<"all" | MediaType>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("planned");
  const [adding, setAdding] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<NormalizedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [liveTypes, setLiveTypes] = useState<string[]>(["anime", "manga", "book"]);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.liveTypes)) setLiveTypes(data.liveTypes); })
      .catch(() => {});
  }, []);

  const isLiveTab = type !== "all" && liveTypes.includes(type);
  const useLive = isLiveTab && query.trim().length > 0;

  useEffect(() => {
    if (!useLive) { setLiveResults([]); setSearching(false); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setLiveResults(Array.isArray(data.results) ? data.results : []);
      } catch { setLiveResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(handle);
  }, [type, query, useLive]);

  const catalogCards: Card[] = useMemo(
    () => CATALOG.filter((item) => (type === "all" || item.type === type) && `${item.title} ${item.creator}`.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({ key: `catalog-${item.apiId}`, type: item.type, apiId: item.apiId, title: item.title, creator: item.creator, year: item.year, progressTotal: item.progressTotal, description: item.description, cover: item.cover, accent: item.accent })),
    [type, query]
  );

  const liveCards: Card[] = liveResults.map((r) => ({ key: `${r.source}-${r.apiId}`, type: r.type, apiId: r.apiId, source: r.source, title: r.title, creator: r.creator, year: r.year, progressTotal: r.progressTotal, description: r.description, coverUrl: r.coverUrl }));

  const cards = useLive ? liveCards : catalogCards;
  const keyGated = type !== "all" && !liveTypes.includes(type) && query.trim().length > 0;

  const add = useCallback(async (card: Card, favorite = false) => {
    if (!session) { setView("login"); return; }
    setAdding(`${card.apiId}-${favorite}`);
    const payload = card.source
      ? { type: card.type, apiId: card.apiId, source: card.source, title: card.title, creator: card.creator, year: card.year, coverUrl: card.coverUrl, progressTotal: card.progressTotal, status, favorite }
      : { apiId: card.apiId, status, favorite };
    const res = await fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      toast({ title: favorite ? "Saved as a favourite!" : "Added to your stack!" });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Could not add title", description: data.error, variant: "destructive" });
    }
    setAdding(null);
  }, [session, status, setView, toast]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[.18em] text-primary">DISCOVER</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Find your next favourite.</h1>
        <p className="mt-3 text-muted-foreground">Live-search anime, manga, and books. Browse a curated preview for movies, TV, games, and music.</p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((key) => (
            <button key={key} onClick={() => setType(key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${type === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {key === "all" ? "All" : mediaConfig(key).label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="planned">Plan to try</option>
            <option value="watching">Watching / playing</option>
            <option value="completed">Completed</option>
            <option value="onhold">On hold</option>
            <option value="dropped">Dropped</option>
          </select>
          <div className="relative">
            <Input className="w-full sm:w-64 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles or creators" />
            <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">⌕</span>
          </div>
        </div>
      </div>

      {keyGated && (
        <div className="mt-5 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Live search for <b>{mediaConfig(type).label}</b> needs a free API key — coming soon. Showing a curated preview for now.
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((item) => (
          <Card key={item.key} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex p-4 gap-4">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-full w-full items-end p-2 text-2xl" style={{ background: `linear-gradient(145deg, ${item.accent || "#2e51a2"}, hsl(var(--card)) 90%)` }}>
                      {item.cover || TYPE_ICONS[item.type]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <span>{TYPE_ICONS[item.type]}</span>{item.type.toUpperCase()}
                  </div>
                  <h2 className="mt-1 font-bold leading-5 truncate">{item.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{item.creator} · {item.year}</p>
                  {item.description && <p className="mt-3 text-xs leading-5 text-muted-foreground line-clamp-2">{item.description}</p>}
                </div>
              </div>
              <div className="border-t px-4 py-3 flex gap-2">
                <Button variant="outline" size="sm" className="grow" disabled={adding === `${item.apiId}-false`} onClick={() => add(item)}>
                  {adding === `${item.apiId}-false` ? "Adding…" : "+ Add to stack"}
                </Button>
                <Button variant="outline" size="sm" className="px-3 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500" disabled={adding === `${item.apiId}-true`} onClick={() => add(item, true)}>
                  {adding === `${item.apiId}-true` ? "…" : "♥"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {searching && <Card className="mt-8 py-14 text-center text-muted-foreground"><CardContent>Searching…</CardContent></Card>}
      {!searching && !cards.length && <Card className="mt-8 py-14 text-center text-muted-foreground"><CardContent>No titles found. Try a different search.</CardContent></Card>}
    </div>
  );
}
