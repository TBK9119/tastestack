import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingAniList, type AniListSort } from "@/lib/api/anilist";
import { fetchTrendingOpenLibrary, type OpenLibraryTrendingPeriod } from "@/lib/api/openlibrary";

const SORT_MAP: Record<string, AniListSort> = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  top: "SCORE_DESC",
};

// OpenLibrary has no per-title rating/popularity score to sort by, so the
// same three sort options are approximated with reading-log time windows:
// a short window for "what's hot right now", a longer one for sustained
// popularity, and all-time for enduring favourites.
const BOOK_PERIOD_MAP: Record<string, OpenLibraryTrendingPeriod> = {
  trending: "weekly",
  popular: "monthly",
  top: "forever",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const sortParam = searchParams.get("sort") || "trending";
  const sort = SORT_MAP[sortParam] || "TRENDING_DESC";
  const page = parseInt(searchParams.get("page") || "1", 10);

  switch (type) {
    case "anime":
    case "manga":
      return NextResponse.json({ results: await fetchTrendingAniList(type, sort, page) });
    case "book":
      return NextResponse.json({ results: await fetchTrendingOpenLibrary(BOOK_PERIOD_MAP[sortParam] || "weekly", 12, page) });
    default:
      return NextResponse.json({ results: [] });
  }
}
