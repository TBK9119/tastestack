// Client-safe parsers for the three big tracker export formats. Each returns
// a flat list of ParsedEntry so the ImportSection UI can preview a count and
// hand batches to POST /api/import, which does the title -> API match and
// upsert. All three formats are exported by their respective services from
// account settings, so the person uploads the raw file they downloaded —
// no server-side processing of the raw export is needed.
import Papa from "papaparse";
import { XMLParser } from "fast-xml-parser";
import type { ItemStatus } from "@/lib/constants";

export interface ParsedEntry {
  title: string;
  year?: string;
  status: ItemStatus;
  rating: number; // 0-10, matches TasteStack's scale
  progressCurrent: number;
  progressTotal: number;
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// ---------- MyAnimeList (Panel > Export List) — XML ----------
const MAL_ANIME_STATUS: Record<string, ItemStatus> = {
  Watching: "watching", Completed: "completed", "On-Hold": "onhold", Dropped: "dropped", "Plan to Watch": "planned",
};
const MAL_MANGA_STATUS: Record<string, ItemStatus> = {
  Reading: "watching", Completed: "completed", "On-Hold": "onhold", Dropped: "dropped", "Plan to Read": "planned",
};

export function parseMyAnimeListXml(xmlText: string): { anime: ParsedEntry[]; manga: ParsedEntry[] } {
  let root: { anime?: unknown[]; manga?: unknown[] };
  try {
    root = new XMLParser().parse(xmlText)?.myanimelist;
  } catch {
    return { anime: [], manga: [] };
  }
  if (!root) return { anime: [], manga: [] };

  interface MALNode {
    series_title?: string | number; my_status?: string | number; my_score?: string | number;
    my_watched_episodes?: string | number; series_episodes?: string | number;
    my_read_chapters?: string | number; series_chapters?: string | number;
  }

  const anime = (toArray(root.anime) as MALNode[])
    .map((a: MALNode): ParsedEntry | null => {
      const title = String(a.series_title || "").trim();
      if (!title) return null;
      return {
        title,
        status: MAL_ANIME_STATUS[String(a.my_status)] || "planned",
        rating: Math.max(0, Math.min(10, Math.round(Number(a.my_score) || 0))),
        progressCurrent: Math.max(0, Math.round(Number(a.my_watched_episodes) || 0)),
        progressTotal: Math.max(0, Math.round(Number(a.series_episodes) || 0)),
      };
    })
    .filter((e: ParsedEntry | null): e is ParsedEntry => e !== null);

  const manga = (toArray(root.manga) as MALNode[])
    .map((m: MALNode): ParsedEntry | null => {
      const title = String(m.series_title || "").trim();
      if (!title) return null;
      return {
        title,
        status: MAL_MANGA_STATUS[String(m.my_status)] || "planned",
        rating: Math.max(0, Math.min(10, Math.round(Number(m.my_score) || 0))),
        progressCurrent: Math.max(0, Math.round(Number(m.my_read_chapters) || 0)),
        progressTotal: Math.max(0, Math.round(Number(m.series_chapters) || 0)),
      };
    })
    .filter((e: ParsedEntry | null): e is ParsedEntry => e !== null);

  return { anime, manga };
}

// ---------- Letterboxd (Settings > Import & Export > Export) — diary.csv or ratings.csv ----------
export function parseLetterboxdCsv(csvText: string): ParsedEntry[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const byKey = new Map<string, ParsedEntry>();
  for (const row of data) {
    const title = (row["Name"] || "").trim();
    if (!title) continue;
    const year = (row["Year"] || "").trim();
    const stars = parseFloat(row["Rating"] || "");
    const rating = Number.isFinite(stars) ? Math.max(0, Math.min(10, Math.round(stars * 2))) : 0;
    const key = `${title.toLowerCase()}|${year}`;
    const existing = byKey.get(key);
    if (!existing || rating > existing.rating) {
      byKey.set(key, { title, year: year || undefined, status: "completed", rating, progressCurrent: 1, progressTotal: 1 });
    }
  }
  return Array.from(byKey.values());
}

// ---------- Goodreads (My Books > Import/Export > Export Library) — goodreads_library_export.csv ----------
const GOODREADS_SHELF: Record<string, ItemStatus> = {
  read: "completed", "currently-reading": "watching", "to-read": "planned",
};

export function parseGoodreadsCsv(csvText: string): ParsedEntry[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  return data
    .map((row): ParsedEntry | null => {
      const title = (row["Title"] || "").trim();
      if (!title) return null;
      const shelf = (row["Exclusive Shelf"] || "").trim().toLowerCase();
      const status = GOODREADS_SHELF[shelf] || "planned";
      const myRating = parseFloat(row["My Rating"] || "0");
      const rating = Number.isFinite(myRating) ? Math.max(0, Math.min(10, Math.round(myRating * 2))) : 0;
      const pages = Math.max(0, parseInt(row["Number of Pages"] || "0", 10) || 0);
      const year = (row["Original Publication Year"] || row["Year Published"] || "").trim();
      return {
        title,
        year: year || undefined,
        status,
        rating,
        progressCurrent: status === "completed" ? pages : 0,
        progressTotal: pages,
      };
    })
    .filter((e): e is ParsedEntry => e !== null);
}
