"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { CATALOG, TYPE_ICONS } from "@/lib/catalog";
import { mediaConfig, type MediaType } from "@/lib/constants";
import type { NormalizedResult } from "@/lib/api/anilist";

const TABS: Array<["all" | MediaType, string]> = [
  ["all", "All"],
  ["anime", "Anime"],
  ["manga", "Manga"],
  ["movie", "Movies"],
  ["tv", "TV"],
  ["game", "Games"],
  ["album", "Music"],
  ["book", "Books"],
];

type Card = {
  key: string;
  type: MediaType;
  apiId: string;
  source?: string; // present only for live search results
  title: string;
  creator: string;
  year: string;
  progressTotal: number;
  description: string;
  cover?: string; // catalog glyph
  accent?: string; // catalog gradient color
  coverUrl?: string; // live result image
};

export default function DiscoverClient({
  availability,
}: {
  availability: Record<MediaType, boolean>;
}) {
  const { data: session } = useSession();
  const [type, setType] = useState<"all" | MediaType>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("planned");
  const [adding, setAdding] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [liveResults, setLiveResults] = useState<NormalizedResult[]>([]);
  const [searching, setSearching] = useState(false);

  const isLiveTab = type !== "all" && availability[type];
  const useLive = isLiveTab && query.trim().length > 0;

  // Debounced live search against AniList / Open Library.
  useEffect(() => {
    if (!useLive) {
      setLiveResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setLiveResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setLiveResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, query, useLive]);

  const catalogCards: Card[] = useMemo(
    () =>
      CATALOG.filter(
        (item) =>
          (type === "all" || item.type === type) &&
          `${item.title} ${item.creator}`.toLowerCase().includes(query.toLowerCase())
      ).map((item) => ({
        key: `catalog-${item.apiId}`,
        type: item.type,
        apiId: item.apiId,
        title: item.title,
        creator: item.creator,
        year: item.year,
        progressTotal: item.progressTotal,
        description: item.description,
        cover: item.cover,
        accent: item.accent,
      })),
    [type, query]
  );

  const liveCards: Card[] = liveResults.map((r) => ({
    key: `${r.source}-${r.apiId}`,
    type: r.type,
    apiId: r.apiId,
    source: r.source,
    title: r.title,
    creator: r.creator,
    year: r.year,
    progressTotal: r.progressTotal,
    description: r.description,
    coverUrl: r.coverUrl,
  }));

  const cards = useLive ? liveCards : catalogCards;
  const keyGated = type !== "all" && !availability[type];

  async function add(card: Card, favorite = false) {
    setAdding(`${card.apiId}-${favorite}`);
    setMessage("");
    const payload = card.source
      ? {
          type: card.type,
          apiId: card.apiId,
          source: card.source,
          title: card.title,
          creator: card.creator,
          year: card.year,
          coverUrl: card.coverUrl,
          progressTotal: card.progressTotal,
          status,
          favorite,
        }
      : { apiId: card.apiId, status, favorite };

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setAdding(null);
    setMessage(
      res.ok
        ? favorite
          ? "Saved as a favourite."
          : "Added to your stack."
        : data.error || "Could not add that title."
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[.18em] text-brand-500">DISCOVER</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Find your next favourite.</h1>
        <p className="mt-3 text-ink-500">
          Live-search anything with a connected provider, or browse a curated preview for the rest.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                type === key ? "bg-brand-500 text-ink-950" : "bg-ink-900 text-ink-500 hover:text-ink-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="planned">Plan to try</option>
            <option value="watching">Watching / playing</option>
            <option value="completed">Completed</option>
            <option value="onhold">On hold</option>
            <option value="dropped">Dropped</option>
          </select>
          <label className="relative block">
            <span className="absolute left-3 top-2.5 text-ink-600">⌕</span>
            <input
              className="input w-full sm:w-64 pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles or creators"
            />
          </label>
        </div>
      </div>

      {keyGated && (
        <div className="mt-5 rounded-lg border border-ink-800 bg-ink-900 px-4 py-3 text-sm text-ink-500">
          Live search for <b>{mediaConfig(type as MediaType).label}</b> needs a free{" "}
          {mediaConfig(type as MediaType).source} API key — add{" "}
          <code className="text-ink-300">{mediaConfig(type as MediaType).keyEnvVar}</code> to your{" "}
          <code className="text-ink-300">.env.local</code> to unlock it. Showing a curated preview for now.
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-500">
          {message} {!session && <Link href="/login" className="underline">Log in</Link>}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((item) => (
          <article key={item.key} className="card overflow-hidden">
            <div className="flex p-4 gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
                {item.coverUrl ? (
                  <Image src={item.coverUrl} alt={item.title} fill sizes="80px" className="object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-end p-2 text-2xl"
                    style={{ background: `linear-gradient(145deg, ${item.accent || "#2e51a2"}, #14202c 90%)` }}
                  >
                    {item.cover || TYPE_ICONS[item.type]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-500">
                  <span>{TYPE_ICONS[item.type]}</span>
                  {item.type.toUpperCase()}
                </div>
                <h2 className="mt-1 font-bold leading-5 text-ink-300">{item.title}</h2>
                <p className="mt-1 text-xs text-ink-500">
                  {item.creator} · {item.year}
                </p>
                {item.description && (
                  <p className="mt-3 text-xs leading-5 text-ink-500 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>
            <div className="border-t border-ink-800 px-4 py-3 flex gap-2">
              <button
                disabled={adding === `${item.apiId}-false`}
                onClick={() => add(item)}
                className="btn-secondary grow hover:border-brand-500 hover:text-brand-500"
              >
                {adding === `${item.apiId}-false` ? "Adding…" : "+ Add to stack"}
              </button>
              <button
                disabled={adding === `${item.apiId}-true`}
                onClick={() => add(item, true)}
                aria-label={`Favourite ${item.title}`}
                className="btn-secondary px-3 text-gold hover:border-gold"
              >
                {adding === `${item.apiId}-true` ? "…" : "♥"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {searching && (
        <div className="card mt-8 py-14 text-center text-ink-500">Searching…</div>
      )}
      {!searching && !cards.length && (
        <div className="card mt-8 py-14 text-center text-ink-500">No titles found. Try a different search.</div>
      )}
    </div>
  );
}
