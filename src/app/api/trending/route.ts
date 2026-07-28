import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingAniList, type AniListSort } from "@/lib/api/anilist";

const SORT_MAP: Record<string, AniListSort> = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  top: "SCORE_DESC",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const sort = SORT_MAP[searchParams.get("sort") || "trending"] || "TRENDING_DESC";

  switch (type) {
    case "anime":
    case "manga":
      return NextResponse.json({ results: await fetchTrendingAniList(type, sort) });
    default:
      return NextResponse.json({ results: [] });
  }
}
