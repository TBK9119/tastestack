// RAWG video game database search API. Requires a free API key.
// Docs: https://rawg.io/apidocs

import type { NormalizedResult } from "./anilist";

const SEARCH_ENDPOINT = "https://api.rawg.io/api/games";

export async function searchRAWG(query: string): Promise<NormalizedResult[]> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("search", query);
    url.searchParams.set("page_size", "20");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const results = json?.results;
    if (!Array.isArray(results)) return [];

    return results.map((g: any) => {
      const platforms = Array.isArray(g.platforms)
        ? g.platforms
            .map((p: any) => p?.platform?.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(", ")
        : "";
      return {
        type: "game",
        apiId: String(g.id),
        source: "rawg",
        title: g.name || "Untitled",
        creator: platforms || "Unknown",
        year: g.released ? String(g.released).slice(0, 4) : "—",
        coverUrl: g.background_image || "",
        description: "",
        progressTotal: Math.round(Number(g.playtime) || 0),
      } satisfies NormalizedResult;
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
