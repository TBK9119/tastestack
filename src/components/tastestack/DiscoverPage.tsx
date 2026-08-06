"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CATALOG, catalogSourceForType } from "@/lib/catalog";
import { TYPE_ICONS, type MediaType, mediaConfig } from "@/lib/constants";
import type { NormalizedResult } from "@/lib/api/anilist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import CoverImage from "@/components/tastestack/CoverImage";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, SearchX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Card = {
  key: string; type: MediaType; apiId: string; source?: string;
  title: string; creator: string; year: string; progressTotal: number;
  description: string; cover?: string; accent?: string; coverUrl?: string;
};

interface RecItem {
  type: MediaType; apiId: string; source: string;
  title: string; creator: string; year: string; coverUrl: string; reason: string;
}

function recKey(r: { type: MediaType; source: string; apiId: string }) {
  return `${r.type}:${r.source}:${r.apiId}`;
}

// A horizontally-scrolling row of poster cards for one recommendation
// category. Kept at module scope (not nested in DiscoverPage) so its
// component identity is stable across re-renders — nesting it inside the
// page component would remount this whole row (and re-flicker every cover
// image) on every keystroke in the search box.
function RecRow({ title, items, addedKeys, adding, onAdd }: {
  title: string; items: RecItem[]; addedKeys: Set<string>; adding: string | null;
  onAdd: (r: RecItem) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {items.map((r) => {
          const key = recKey(r);
          const already = addedKeys.has(key);
          const isAdding = adding === `${r.apiId}-false`;
          return (
            <div key={key} className="group relative w-28 shrink-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                <CoverImage src={r.coverUrl} alt={r.title} icon={TYPE_ICONS[r.type]} sizes="112px" fallbackClassName="p-2" />
                <button
                  onClick={() => onAdd(r)}
                  disabled={already || isAdding}
                  title={already ? "In your stack" : "Add to stack"}
                  className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-xs backdrop-blur transition ${already ? "bg-primary text-primary-foreground" : "bg-black/70 text-white opacity-0 group-hover:opacity-100"}`}
                >
                  {isAdding ? "…" : already ? "✓" : "+"}
                </button>
              </div>
              <p className="mt-1.5 truncate text-xs font-semibold">{r.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{r.creator} · {r.year}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS: Array<"all" | MediaType> = ["all", "anime", "manga", "movie", "tv", "game", "album", "book"];
const TRENDING_TYPES = ["anime", "manga", "book"];
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Most popular" },
  { value: "top", label: "Top rated" },
];

export default function DiscoverPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [type, setType] = useState<"all" | MediaType>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("trending");
  const [adding, setAdding] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<NormalizedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [liveTypes, setLiveTypes] = useState<string[]>(["anime", "manga", "book"]);
  const [catalogCovers, setCatalogCovers] = useState<Record<string, string>>({});
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [favoritedKeys, setFavoritedKeys] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [newListName, setNewListName] = useState("");
  const [recs, setRecs] = useState<{ social: RecItem[]; community: RecItem[]; forYou: RecItem[] } | null>(null);
  const { toast } = useToast();

  // A card's identity in the database is (type, source, apiId) — catalog
  // cards don't carry a `source` field, so it's derived the same way the
  // /api/items POST route derives it for catalog upserts.
  const keyFor = useCallback((card: Card) => `${card.type}:${card.source || catalogSourceForType(card.type)}:${card.apiId}`, []);

  useEffect(() => {
    if (!session) { setAddedKeys(new Set()); setFavoritedKeys(new Set()); return; }
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data.items)) return;
        setAddedKeys(new Set(data.items.map((it: { type: string; source: string; apiId: string }) => `${it.type}:${it.source}:${it.apiId}`)));
        setFavoritedKeys(new Set(data.items.filter((it: { isFavorite: boolean }) => it.isFavorite).map((it: { type: string; source: string; apiId: string }) => `${it.type}:${it.source}:${it.apiId}`)));
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.liveTypes)) setLiveTypes(data.liveTypes); })
      .catch(() => {});
  }, []);

  // The "All" tab's default (no-query) view falls back to the small curated
  // CATALOG list, which only carries an icon glyph — no real cover art. For
  // the three sources that don't need a paid key (anime/manga/book), fetch
  // the real cover for each specific title once on mount so those cards
  // look like the rest of the app instead of blank icon tiles. Movies, TV,
  // games, and music stay icon tiles until their API keys are configured.
  useEffect(() => {
    const freeCatalogItems = CATALOG.filter((item) => item.type === "anime" || item.type === "manga" || item.type === "book");
    Promise.all(
      freeCatalogItems.map((item) =>
        fetch(`/api/search?type=${item.type}&q=${encodeURIComponent(item.title)}`)
          .then((r) => r.json())
          .then((data) => ({ apiId: item.apiId, coverUrl: Array.isArray(data.results) ? data.results[0]?.coverUrl : undefined }))
          .catch(() => ({ apiId: item.apiId, coverUrl: undefined }))
      )
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) if (r.coverUrl) map[r.apiId] = r.coverUrl;
      if (Object.keys(map).length) setCatalogCovers(map);
    });
  }, []);

  useEffect(() => {
    if (!session) { setLists([]); return; }
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.lists)) setLists(data.lists.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))); })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) { setRecs(null); return; }
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => setRecs(data))
      .catch(() => setRecs(null));
  }, [session]);

  const isLiveTab = type !== "all" && liveTypes.includes(type);
  const hasQuery = query.trim().length > 0;
  const showTrendingSort = TRENDING_TYPES.includes(type) && !hasQuery;
  const useLive = (isLiveTab && (hasQuery || TRENDING_TYPES.includes(type))) || (type === "all" && hasQuery);

  useEffect(() => {
    if (!useLive) { setLiveResults([]); setSearching(false); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const url = type === "all"
          ? `/api/search?type=all&q=${encodeURIComponent(query)}`
          : hasQuery
            ? `/api/search?type=${type}&q=${encodeURIComponent(query)}`
            : `/api/trending?type=${type}&sort=${sort}`;
        const res = await fetch(url);
        const data = await res.json();
        setLiveResults(Array.isArray(data.results) ? data.results : []);
      } catch { setLiveResults([]); }
      finally { setSearching(false); }
    }, hasQuery ? 400 : 0);
    return () => clearTimeout(handle);
  }, [type, query, useLive, hasQuery, sort]);

  const catalogCards: Card[] = useMemo(
    () => CATALOG.filter((item) => (type === "all" || item.type === type) && `${item.title} ${item.creator}`.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({ key: `catalog-${item.apiId}`, type: item.type, apiId: item.apiId, title: item.title, creator: item.creator, year: item.year, progressTotal: item.progressTotal, description: item.description, cover: item.cover, accent: item.accent, coverUrl: catalogCovers[item.apiId] })),
    [type, query, catalogCovers]
  );

  // On the All tab, fill in titles the live search can't reach yet (movies,
  // TV, games, and music without an API key configured) from the curated
  // catalog, so a search still surfaces something for those categories.
  const catalogFallbackCards: Card[] = useMemo(() => {
    if (type !== "all" || !hasQuery) return [];
    return CATALOG.filter((item) => !liveTypes.includes(item.type) && `${item.title} ${item.creator}`.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({ key: `catalog-${item.apiId}`, type: item.type, apiId: item.apiId, title: item.title, creator: item.creator, year: item.year, progressTotal: item.progressTotal, description: item.description, cover: item.cover, accent: item.accent }));
  }, [type, hasQuery, query, liveTypes]);

  const liveCards: Card[] = liveResults.map((r) => ({ key: `${r.source}-${r.apiId}`, type: r.type, apiId: r.apiId, source: r.source, title: r.title, creator: r.creator, year: r.year, progressTotal: r.progressTotal, description: r.description, coverUrl: r.coverUrl }));

  const cards = useLive ? [...liveCards, ...catalogFallbackCards] : catalogCards;
  const keyGated = type !== "all" && !liveTypes.includes(type);

  const add = useCallback(async (card: Card, favorite = false) => {
    if (!session) { router.push("/login"); return; }
    setAdding(`${card.apiId}-${favorite}`);
    const payload = card.source
      ? { type: card.type, apiId: card.apiId, source: card.source, title: card.title, creator: card.creator, year: card.year, coverUrl: card.coverUrl, progressTotal: card.progressTotal, favorite }
      : { apiId: card.apiId, favorite };
    const res = await fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const cardKey = keyFor(card);
      setAddedKeys((prev) => new Set(prev).add(cardKey));
      if (favorite) setFavoritedKeys((prev) => new Set(prev).add(cardKey));
      toast({ title: favorite ? "Saved as a favourite!" : "Added to your stack — set its status from your profile." });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: "Could not add title", description: data.error, variant: "destructive" });
    }
    setAdding(null);
  }, [session, router, toast, keyFor]);

  const addToList = useCallback(async (listId: string, card: Card) => {
    if (!session) { router.push("/login"); return; }
    const payload = card.source
      ? { type: card.type, apiId: card.apiId, source: card.source, title: card.title, creator: card.creator, year: card.year, coverUrl: card.coverUrl }
      : { apiId: card.apiId };
    const res = await fetch(`/api/lists/${listId}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const listName = lists.find((l) => l.id === listId)?.name || "your list";
    if (res.ok) {
      toast({ title: `Added to "${listName}"` });
    } else {
      const data = await res.json().catch(() => ({}));
      const already = data.error === "Already in this list.";
      toast({ title: already ? `Already in "${listName}"` : "Could not add to list", description: already ? undefined : data.error, variant: already ? "default" : "destructive" });
    }
  }, [session, router, toast, lists]);

  const quickCreateList = useCallback(async (card: Card) => {
    const name = newListName.trim();
    if (!name) return;
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, isPublic: true }) });
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => [{ id: data.list.id, name: data.list.name }, ...prev]);
      setNewListName("");
      await addToList(data.list.id, card);
    } else {
      toast({ title: "Could not create list", variant: "destructive" });
    }
  }, [newListName, addToList, toast]);

  const addRec = useCallback((r: RecItem) => {
    add({ key: recKey(r), type: r.type, apiId: r.apiId, source: r.source, title: r.title, creator: r.creator, year: r.year, progressTotal: 0, description: "", coverUrl: r.coverUrl });
  }, [add]);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[.18em] text-primary">DISCOVER</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Find your next favourite.</h1>
        <p className="mt-3 text-muted-foreground">Live-search anime, manga, and books — the All tab searches everything at once. Movies, TV, games, and music show a curated preview for now.</p>
      </div>

      {session && !hasQuery && type === "all" && recs && (recs.forYou.length > 0 || recs.social.length > 0 || recs.community.length > 0) && (
        <div className="mt-10 rounded-xl border bg-muted/40 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold tracking-[.18em] text-primary">RECOMMENDED FOR YOU</p>
          </div>
          <RecRow title={recs.forYou[0]?.reason || "For you"} items={recs.forYou} addedKeys={addedKeys} adding={adding} onAdd={addRec} />
          <RecRow title="Trending with people you follow" items={recs.social} addedKeys={addedKeys} adding={adding} onAdd={addRec} />
          <RecRow title="Popular on TasteStack" items={recs.community} addedKeys={addedKeys} adding={adding} onAdd={addRec} />
        </div>
      )}

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
          {showTrendingSort && (
            <select className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}
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

      <motion.div 
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
        }}
      >
        <AnimatePresence mode="popLayout">
          {!searching && cards.map((item) => (
            <motion.div
              key={item.key}
              layoutId={`discover-card-${item.key}`}
              variants={{
                hidden: { opacity: 0, scale: 0.95, y: 10 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 25 } }
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            >
              <Card className="overflow-hidden h-full">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="flex p-4 gap-4 flex-1">
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border shadow-sm">
                      <CoverImage src={item.coverUrl} alt={item.title} icon={item.cover || TYPE_ICONS[item.type]} accent={item.accent} fallbackClassName="p-2" sizes="80px" />
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
                  <div className="border-t bg-muted/20 px-4 py-3 flex gap-2">
                    <Button variant="outline" size="sm" className="grow" disabled={adding === `${item.apiId}-false` || addedKeys.has(keyFor(item))} onClick={() => add(item)}>
                      {adding === `${item.apiId}-false` ? "Adding…" : addedKeys.has(keyFor(item)) ? "✓ In stack" : "+ Add to stack"}
                    </Button>
                    <Button variant="outline" size="sm" className={`px-3 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500 ${favoritedKeys.has(keyFor(item)) ? "bg-yellow-50" : ""}`} disabled={adding === `${item.apiId}-true` || favoritedKeys.has(keyFor(item))} onClick={() => add(item, true)}>
                      {adding === `${item.apiId}-true` ? "…" : favoritedKeys.has(keyFor(item)) ? "♥" : "♡"}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="px-3" title="Add to a list">☰</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Add to a list</p>
                        <div className="max-h-40 overflow-y-auto">
                          {lists.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No lists yet — create one below.</p>}
                          {lists.map((list) => (
                            <button key={list.id} onClick={() => addToList(list.id, item)} className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent">
                              {list.name}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-1.5 border-t pt-2">
                          <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); quickCreateList(item); } }} placeholder="New list name" className="h-8 text-xs" />
                          <Button size="sm" className="h-8 shrink-0 px-2.5" onClick={() => quickCreateList(item)} disabled={!newListName.trim()}>Add</Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {searching && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex p-4 gap-4">
                  <Skeleton className="h-28 w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-3 pt-1">
                    <Skeleton className="h-3 w-14 rounded" />
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                    <Skeleton className="h-3 w-full rounded mt-3" />
                    <Skeleton className="h-3 w-5/6 rounded" />
                  </div>
                </div>
                <div className="border-t px-4 py-3 flex gap-2">
                  <Skeleton className="h-9 grow rounded-md" />
                  <Skeleton className="h-9 w-10 rounded-md" />
                  <Skeleton className="h-9 w-10 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!searching && !cards.length && (
        <Card className="mt-8 overflow-hidden border-none shadow-sm bg-gradient-to-br from-muted/50 to-muted/10 relative">
          <CardContent className="flex flex-col items-center py-20 text-center relative z-10">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-4">
              <SearchX className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">No titles found</h3>
            <p className="mt-2 text-muted-foreground text-sm max-w-sm">
              We couldn't find any matches for "{query}". Try checking your spelling or using different keywords.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
