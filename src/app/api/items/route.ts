import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATALOG, catalogSourceForType } from "@/lib/catalog";

const STATUS_VALUES = ["watching", "completed", "planned", "dropped", "onhold"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const usernameParam = searchParams.get("username");
  const typeFilter = searchParams.get("type");
  const statusFilter = searchParams.get("status");

  const session = await getServerSession(authOptions);
  let targetUserId: string;

  if (usernameParam) {
    // Viewing a profile's items (own or someone else's public profile).
    const targetUser = await db.user.findUnique({
      where: { username: usernameParam.toLowerCase() },
      select: { id: true, isPublic: true },
    });
    if (!targetUser) return NextResponse.json({ items: [] });

    const isOwn = session?.user?.id === targetUser.id;
    if (!targetUser.isPublic && !isOwn) return NextResponse.json({ items: [] });
    targetUserId = targetUser.id;
  } else {
    // No username given: caller wants their own library, must be logged in.
    if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    targetUserId = session.user.id;
  }

  const where: Record<string, any> = { userId: targetUserId };
  if (typeFilter) where.type = typeFilter;
  if (statusFilter && STATUS_VALUES.includes(statusFilter)) where.status = statusFilter;

  const items = await db.item.findMany({
    where,
    orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const uid = session.user.id;

  const body = await request.json();
  const status = STATUS_VALUES.includes(body.status) ? body.status : "planned";

  let record: {
    type: string; apiId: string; source: string;
    title: string; year: string; coverUrl: string; extra: string; progressTotal: number;
  };

  if (body.source) {
    const type = ["anime","manga","movie","tv","game","album","book"].includes(body.type) ? body.type : null;
    const source = ["anilist","tmdb","rawg","lastfm","openlibrary"].includes(body.source) ? body.source : null;
    if (!type || !source || !body.apiId || !body.title) {
      return NextResponse.json({ error: "Incomplete item data." }, { status: 400 });
    }
    const coverUrl = typeof body.coverUrl === "string" && body.coverUrl.startsWith("https://") ? body.coverUrl.slice(0, 500) : "";
    record = {
      type, apiId: String(body.apiId).slice(0, 120), source,
      title: String(body.title).slice(0, 200), year: String(body.year || "—").slice(0, 20),
      coverUrl, extra: JSON.stringify({ creator: String(body.creator || "Unknown").slice(0, 150) }),
      progressTotal: Math.max(0, Math.round(Number(body.progressTotal) || 0)),
    };
  } else {
    const item = CATALOG.find((e) => e.apiId === body.apiId);
    if (!item) return NextResponse.json({ error: "Title not available." }, { status: 400 });
    const coverUrl = typeof body.coverUrl === "string" && body.coverUrl.startsWith("https://") ? body.coverUrl.slice(0, 500) : "";
    record = {
      type: item.type, apiId: item.apiId, source: catalogSourceForType(item.type),
      title: item.title, year: item.year, coverUrl: coverUrl,
      extra: JSON.stringify({ creator: item.creator, accent: item.accent, cover: item.cover }),
      progressTotal: item.progressTotal || 0,
    };
  }

  const created = await db.item.upsert({
    where: { userId_type_apiId_source: { userId: uid, type: record.type, apiId: record.apiId, source: record.source } },
    update: { status, ...(body.favorite ? { isFavorite: true } : {}) },
    create: {
      userId: uid, type: record.type, apiId: record.apiId, source: record.source,
      title: record.title, year: record.year, coverUrl: record.coverUrl, extra: record.extra,
      status, isFavorite: Boolean(body.favorite), progressTotal: record.progressTotal,
    },
  });

  await db.activity.create({ data: { userId: uid, itemId: created.id, action: "added" } });
  return NextResponse.json({ item: created });
}
