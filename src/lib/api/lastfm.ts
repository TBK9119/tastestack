// Last.fm album search API. Requires a free API key.
// Docs: https://www.last.fm/api/show/album.search

import type { NormalizedResult } from "./anilist";

const ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

export async function searchLastFm(query: string): Promise<NormalizedResult[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set("method", "album.search");
    url.searchParams.set("album", query);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const matches = json?.results?.albummatches?.album;
    const albums = Array.isArray(matches) ? matches : [];

    interface LastFmImage { size: string; "#text": string; }
    interface LastFmAlbum { name?: string; artist?: string; image?: LastFmImage[]; }

    return albums
      .filter((a: LastFmAlbum) => a?.name && a?.artist)
      .map((a: LastFmAlbum) => {
        const images = Array.isArray(a.image) ? a.image : [];
        const large = images.find((i: LastFmImage) => i.size === "extralarge") || images[images.length - 1];
        const coverUrl = large?.["#text"] || "";
        return {
          type: "album",
          apiId: `${a.artist}::${a.name}`.slice(0, 120),
          source: "lastfm",
          title: a.name ?? "",
          creator: a.artist ?? "",
          year: "—",
          coverUrl,
          description: "",
          progressTotal: 1,
        } satisfies NormalizedResult;
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
