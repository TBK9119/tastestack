import type { MediaType } from "@/lib/constants";

export type NormalizedResult = {
  type: MediaType;
  apiId: string;
  source: string;
  title: string;
  creator: string;
  year: string;
  coverUrl: string;
  description: string;
  progressTotal: number;
};

export type AniListSort = "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
query ($search: String, $type: MediaType, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title { romaji english }
      coverImage { large }
      startDate { year }
      episodes
      chapters
      description(asHtml: false)
      studios(isMain: true) { nodes { name } }
      staff(sort: RELEVANCE, perPage: 1) { edges { node { name { full } } } }
    }
  }
}`;

const SORTED_QUERY = `
query ($type: MediaType, $perPage: Int, $sort: [MediaSort]) {
  Page(page: 1, perPage: $perPage) {
    media(type: $type, sort: $sort) {
      id
      title { romaji english }
      coverImage { large }
      startDate { year }
      episodes
      chapters
      description(asHtml: false)
      studios(isMain: true) { nodes { name } }
      staff(sort: RELEVANCE, perPage: 1) { edges { node { name { full } } } }
    }
  }
}`;

function stripHtml(text: string): string {
  return text.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function mapMedia(m: Record<string, any>, kind: "anime" | "manga"): NormalizedResult {
  return {
    type: kind,
    apiId: String(m.id),
    source: "anilist",
    title: m.title?.english || m.title?.romaji || "Untitled",
    creator: m.studios?.nodes?.[0]?.name ?? m.staff?.edges?.[0]?.node?.name?.full ?? "Unknown",
    year: m.startDate?.year ? String(m.startDate.year) : "—",
    coverUrl: m.coverImage?.large || "",
    description: stripHtml(m.description || "").slice(0, 220),
    progressTotal: Number(m.episodes || m.chapters || 0) || 0,
  };
}

async function fetchSortedAniList(kind: "anime" | "manga", sort: AniListSort, perPage: number): Promise<NormalizedResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: SORTED_QUERY, variables: { type: kind.toUpperCase(), perPage, sort: [sort] } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Logged (not just swallowed) so an AniList outage or rate-limit shows
      // up in Vercel's runtime logs instead of silently looking like "no
      // results" to whoever's searching.
      console.error(`AniList ${kind} fetch failed: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    const media = json?.data?.Page?.media;
    if (!Array.isArray(media)) {
      if (json?.errors) console.error(`AniList ${kind} fetch returned errors:`, JSON.stringify(json.errors).slice(0, 500));
      return [];
    }
    return media.map((m: Record<string, any>) => mapMedia(m, kind));
  } catch (err) {
    console.error(`AniList ${kind} fetch threw:`, err instanceof Error ? err.message : err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTrendingAniList(kind: "anime" | "manga", sort: AniListSort = "TRENDING_DESC"): Promise<NormalizedResult[]> {
  return fetchSortedAniList(kind, sort, 12);
}

export async function searchAniList(query: string, kind: "anime" | "manga"): Promise<NormalizedResult[]> {
  const q = query.trim();
  if (!q) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let primary: NormalizedResult[] = [];
  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { search: q, type: kind.toUpperCase(), perPage: 30 } }),
      signal: controller.signal,
    });
    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Page?.media;
      if (Array.isArray(media)) primary = media.map((m: Record<string, any>) => mapMedia(m, kind));
    }
  } catch (err) {
    console.error(`AniList search (${kind}) threw:`, err instanceof Error ? err.message : err);
    primary = [];
  } finally {
    clearTimeout(timeout);
  }

  // AniList's own relevance ranking struggles with short prefixes (e.g. "juju"
  // for "Jujutsu Kaisen") and can come back completely empty. Backstop short
  // or empty searches with a popularity-sorted list filtered by substring
  // match, so well-known titles still surface mid-word.
  const needsBackstop = q.length <= 5 || primary.length === 0;
  if (!needsBackstop) return primary;

  const popular = await fetchSortedAniList(kind, "POPULARITY_DESC", 50);
  const seen = new Set(primary.map((r) => r.apiId));
  const lower = q.toLowerCase();
  const extra = popular.filter((r) => !seen.has(r.apiId) && r.title.toLowerCase().includes(lower));
  return [...primary, ...extra];
}
