import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATALOG } from "@/lib/catalog";
import type { MediaType, ApiSource } from "@/lib/constants";

const MEDIA_TYPE_VALUES: MediaType[] = ["anime", "manga", "movie", "tv", "game", "album", "book"];
const SOURCE_VALUES: ApiSource[] = ["anilist", "tmdb", "rawg", "lastfm", "openlibrary"];
const STATUS_VALUES = ["watching", "completed", "planned", "dropped", "onhold"];

type LiveItemBody = {
  type?: string;
  apiId?: string;
  source?: string;
  title?: string;
  creator?: string;
  year?: string;
  coverUrl?: string;
  progressTotal?: number;
  status?: string;
  favorite?: boolean;
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json()) as LiveItemBody;
  const status = STATUS_VALUES.includes(body.status || "") ? body.status! : "planned";

  let record: {
    type: MediaType;
    apiId: string;
    source: ApiSource;
    title: string;
    year: string;
    coverUrl: string;
    extra: string;
    progressTotal: number;
  };

  if (body.source) {
    // A live search result (currently AniList for anime/manga, Open Library for books).
    const type = MEDIA_TYPE_VALUES.includes(body.type as MediaType) ? (body.type as MediaType) : null;
    const source = SOURCE_VALUES.includes(body.source as ApiSource) ? (body.source as ApiSource) : null;
    if (!type || !source || !body.apiId || !body.title) {
      return NextResponse.json({ error: "That title's data looked incomplete." }, { status: 400 });
    }
    const coverUrl =
      typeof body.coverUrl === "string" && body.coverUrl.startsWith("https://")
        ? body.coverUrl.slice(0, 500)
        : "";
    record = {
      type,
      apiId: String(body.apiId).slice(0, 120),
      source,
      title: String(body.title).slice(0, 200),
      year: String(body.year || "—").slice(0, 20),
      coverUrl,
      extra: JSON.stringify({ creator: String(body.creator || "Unknown").slice(0, 150) }),
      progressTotal: Math.max(0, Math.round(Number(body.progressTotal) || 0)),
    };
  } else {
    // Legacy path: an item picked from the curated demo catalog.
    const item = CATALOG.find((entry) => entry.apiId === body.apiId);
    if (!item) {
      return NextResponse.json({ error: "That title is not available." }, { status: 400 });
    }
    const source: ApiSource =
      item.type === "anime" || item.type === "manga"
        ? "anilist"
        : item.type === "book"
        ? "openlibrary"
        : item.type === "game"
        ? "rawg"
        : item.type === "album"
        ? "lastfm"
        : "tmdb";
    record = {
      type: item.type,
      apiId: item.apiId,
      source,
      title: item.title,
      year: item.year,
      coverUrl: "",
      extra: JSON.stringify({ creator: item.creator, accent: item.accent, cover: item.cover }),
      progressTotal: item.progressTotal || 0,
    };
  }

  const created = await prisma.item.upsert({
    where: {
      userId_type_apiId_source: {
        userId: session.user.id,
        type: record.type,
        apiId: record.apiId,
        source: record.source,
      },
    },
    update: { status, ...(body.favorite ? { isFavorite: true } : {}) },
    create: {
      userId: session.user.id,
      type: record.type,
      apiId: record.apiId,
      source: record.source,
      title: record.title,
      year: record.year,
      coverUrl: record.coverUrl,
      extra: record.extra,
      status,
      isFavorite: Boolean(body.favorite),
      progressTotal: record.progressTotal,
    },
  });

  await prisma.activity.create({
    data: { userId: session.user.id, itemId: created.id, action: "added" },
  });

  return NextResponse.json({ item: created });
}
