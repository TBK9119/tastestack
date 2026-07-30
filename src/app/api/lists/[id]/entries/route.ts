import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATALOG, catalogSourceForType } from "@/lib/catalog";

// Add a title to a list. Accepts the same two payload shapes as POST
// /api/items: a full live-search card ({type, apiId, source, title, ...})
// or a bare catalog reference ({apiId}) — see /api/items/route.ts.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id: listId } = await params;
  const list = await db.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
  if (list.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json();
  let record: { type: string; apiId: string; source: string; title: string; year: string; coverUrl: string; extra: string };

  if (body.source) {
    const type = ["anime", "manga", "movie", "tv", "game", "album", "book"].includes(body.type) ? body.type : null;
    const source = ["anilist", "tmdb", "rawg", "lastfm", "openlibrary"].includes(body.source) ? body.source : null;
    if (!type || !source || !body.apiId || !body.title) {
      return NextResponse.json({ error: "Incomplete item data." }, { status: 400 });
    }
    const coverUrl = typeof body.coverUrl === "string" && body.coverUrl.startsWith("https://") ? body.coverUrl.slice(0, 500) : "";
    record = {
      type, apiId: String(body.apiId).slice(0, 120), source,
      title: String(body.title).slice(0, 200), year: String(body.year || "—").slice(0, 20),
      coverUrl, extra: JSON.stringify({ creator: String(body.creator || "Unknown").slice(0, 150) }),
    };
  } else {
    const item = CATALOG.find((e) => e.apiId === body.apiId);
    if (!item) return NextResponse.json({ error: "Title not available." }, { status: 400 });
    record = {
      type: item.type, apiId: item.apiId, source: catalogSourceForType(item.type),
      title: item.title, year: item.year, coverUrl: "",
      extra: JSON.stringify({ creator: item.creator, accent: item.accent, cover: item.cover }),
    };
  }

  const count = await db.listEntry.count({ where: { listId } });

  try {
    const entry = await db.listEntry.create({
      data: { listId, ...record, note: String(body.note || "").slice(0, 240), position: count },
    });
    await db.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });
    return NextResponse.json({ entry });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Already in this list." }, { status: 409 });
    throw err;
  }
}

// Reorder entries: body is { order: string[] } — entry IDs in the desired order.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id: listId } = await params;
  const list = await db.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
  if (list.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json();
  const order: string[] = Array.isArray(body.order) ? body.order : [];
  if (!order.length) return NextResponse.json({ error: "No order given." }, { status: 400 });

  await db.$transaction(
    order.map((entryId, index) => db.listEntry.updateMany({ where: { id: entryId, listId }, data: { position: index } }))
  );

  return NextResponse.json({ ok: true });
}
