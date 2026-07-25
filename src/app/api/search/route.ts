import { NextRequest, NextResponse } from "next/server";
import { searchAniList } from "@/lib/api/anilist";
import { searchOpenLibrary } from "@/lib/api/openlibrary";
import { searchTMDB } from "@/lib/api/tmdb";
import { searchRAWG } from "@/lib/api/rawg";
import { searchLastFm } from "@/lib/api/lastfm";

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
    default:
      return NextResponse.json({ results: [] });
  }
}
