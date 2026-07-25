// The Movie Database (TMDB) search API. Requires a free v3 API key.
// Docs: https://developer.themoviedb.org/reference/search-movie

import type { NormalizedResult } from "./anilist";

const BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export async function searchTMDB(
  query: string,
  kind: "movie" | "tv"
): Promise<NormalizedResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(`${BASE}/search/${kind}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const results = json?.results;
    if (!Array.isArray(results)) return [];

    return results.map((r: any) => {
      const title = kind === "movie" ? r.title : r.name;
      const date = kind === "movie" ? r.release_date : r.first_air_date;
      return {
        type: kind,
        apiId: String(r.id),
        source: "tmdb",
        title: title || "Untitled",
        creator: "Unknown",
        year: date ? String(date).slice(0, 4) : "—",
        coverUrl: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : "",
        description: (r.overview || "").slice(0, 220),
        progressTotal: kind === "movie" ? 1 : 0,
      } satisfies NormalizedResult;
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
