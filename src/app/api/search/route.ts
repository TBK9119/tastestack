import { NextRequest, NextResponse } from "next/server";
import { searchAniList, type NormalizedResult } from "@/lib/api/anilist";
import { searchOpenLibrary } from "@/lib/api/openlibrary";
import { searchTMDB } from "@/lib/api/tmdb";
import { searchRAWG } from "@/lib/api/rawg";
import { searchLastFm } from "@/lib/api/lastfm";

async function searchAll(q: string): Promise<NormalizedResult[]> {
  const settled = await Promise.allSettled([
    searchAniList(q, "anime"),
    searchAniList(q, "manga"),
    searchOpenLibrary(q),
    searchTMDB(q, "movie"),
    searchTMDB(q, "tv"),
    searchRAWG(q),
    searchLastFm(q),
  ]);
  const merged = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Titles that start with the query float to the top; everything else
  // (matched on creator or a mid-title word) follows.
  const lower = q.toLowerCase();
  merged.sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(lower) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(lower) ? 0 : 1;
    return aStarts - bStarts;
  });

  return merged.slice(0, 30);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  switch (type) {
    case "anime":
    case "manga":
      return NextResponse.json({ results: await searchAniList(q, type) });
    case "book":
      return NextResponse.json({ results: await searchOpenLibrary(q) });
    case "movie":
    case "tv":
      return NextResponse.json({ results: await searchTMDB(q, type) });
    case "game":
      return NextResponse.json({ results: await searchRAWG(q) });
    case "album":
      return NextResponse.json({ results: await searchLastFm(q) });
    case "all":
      return NextResponse.json({ results: await searchAll(q) });
    default:
      return NextResponse.json({ results: [] });
  }
}
