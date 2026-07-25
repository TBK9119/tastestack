// AniList's public GraphQL API. No API key required for search queries.
// Docs: https://docs.anilist.co/

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

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
query ($search: String, $type: MediaType, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
      }
      coverImage {
        large
      }
      startDate {
        year
      }
      episodes
      chapters
      description(asHtml: false)
      studios(isMain: true) {
        nodes {
          name
        }
      }
      staff(sort: RELEVANCE, perPage: 1) {
        edges {
          node {
            name {
              full
            }
          }
        }
      }
    }
  }
}`;

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchAniList(
  query: string,
  kind: "anime" | "manga"
): Promise<NormalizedResult[]> {
  if (!query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: QUERY,
        variables: { search: query, type: kind.toUpperCase(), perPage: 20 },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return [];
    const json = await res.json();
    const media = json?.data?.Page?.media;
    if (!Array.isArray(media)) return [];

    return media.map((m: any) => {
      const creator =
        m.studios?.nodes?.[0]?.name ??
        m.staff?.edges?.[0]?.node?.name?.full ??
        "Unknown";
      return {
        type: kind,
        apiId: String(m.id),
        source: "anilist",
        title: m.title?.english || m.title?.romaji || "Untitled",
        creator,
        year: m.startDate?.year ? String(m.startDate.year) : "—",
        coverUrl: m.coverImage?.large || "",
        description: stripHtml(m.description || "").slice(0, 220),
        progressTotal: Number(m.episodes || m.chapters || 0) || 0,
      } satisfies NormalizedResult;
    });
  } catch {
    // Network failure, timeout, or malformed response — fail soft with no results
    // rather than breaking the Discover page.
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
