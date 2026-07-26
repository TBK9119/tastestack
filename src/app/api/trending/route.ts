import { NextRequest, NextResponse } from "next/server";
import { fetchTrendingAniList } from "@/lib/api/anilist";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  switch (type) {
    case "anime":
    case "manga":
      return NextResponse.json({ results: await fetchTrendingAniList(type) });
    default:
      return NextResponse.json({ results: [] });
  }
}