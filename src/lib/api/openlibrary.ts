import type { NormalizedResult } from "./anilist";

const SEARCH_ENDPOINT = "https://openlibrary.org/search.json";

export async function searchOpenLibrary(query: string): Promise<NormalizedResult[]> {
  if (!query.trim()) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "20");
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,number_of_pages_median");
    const res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = await res.json();
    const docs = json?.docs;
    if (!Array.isArray(docs)) return [];
    interface OLSResult {
      title?: string; key?: string; author_name?: string[];
      first_publish_year?: number; cover_i?: number;
      number_of_pages_median?: number;
    }
    return docs
      .filter((d: OLSResult) => d?.title && d?.key)
      .map((d: OLSResult) => ({
        type: "book" as const,
        apiId: String(d.key).replace("/works/", ""),
        source: "openlibrary",
        title: d.title,
        creator: d.author_name?.[0] || "Unknown",
        year: d.first_publish_year ? String(d.first_publish_year) : "—",
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
        description: "",
        progressTotal: Number(d.number_of_pages_median || 0) || 0,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// OpenLibrary's own "what's being logged right now" endpoint — same doc shape
// as search.json (key, title, author_name, cover_i, first_publish_year), so it
// reuses the same field mapping. Used to give the Books tab a default browse
// view (real cover art) before the person has typed anything, mirroring the
// AniList trending browse already used for Anime/Manga.
export type OpenLibraryTrendingPeriod = "daily" | "weekly" | "monthly" | "yearly" | "forever";

export async function fetchTrendingOpenLibrary(period: OpenLibraryTrendingPeriod = "weekly", limit = 12): Promise<NormalizedResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://openlibrary.org/trending/${period}.json?limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = await res.json();
    const works = json?.works;
    if (!Array.isArray(works)) return [];
    interface OLSTrendingResult {
      title?: string; key?: string; author_name?: string[];
      first_publish_year?: number; cover_i?: number;
    }
    return works
      .filter((w: OLSTrendingResult) => w?.title && w?.key)
      .map((w: OLSTrendingResult) => ({
        type: "book" as const,
        apiId: String(w.key).replace("/works/", ""),
        source: "openlibrary",
        title: w.title,
        creator: w.author_name?.[0] || "Unknown",
        year: w.first_publish_year ? String(w.first_publish_year) : "—",
        coverUrl: w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-L.jpg` : "",
        description: "",
        progressTotal: 0,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
