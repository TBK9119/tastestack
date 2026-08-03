import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ListInteractionType } from "@prisma/client";

const VALID_TYPES: ListInteractionType[] = ["LIKE", "FAVORITE", "BOOKMARK"];

async function countsFor(listId: string) {
  const grouped = await db.listInteraction.groupBy({ by: ["type"], where: { listId }, _count: true });
  const counts = { LIKE: 0, FAVORITE: 0, BOOKMARK: 0 };
  for (const row of grouped) counts[row.type] = row._count;
  return counts;
}

// Toggles a LIKE/FAVORITE/BOOKMARK interaction for the signed-in user on a
// list. Public lists can be interacted with by anyone logged in; private
// lists only by their owner (mirrors the visibility rule used elsewhere).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id: listId } = await params;
  const body = await request.json().catch(() => ({}));
  const type = String(body.type || "").toUpperCase() as ListInteractionType;
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid interaction type." }, { status: 400 });

  const list = await db.list.findUnique({ where: { id: listId }, select: { id: true, userId: true, isPublic: true } });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
  const isOwn = list.userId === session.user.id;
  if (!list.isPublic && !isOwn) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const existing = await db.listInteraction.findUnique({
    where: { userId_listId_type: { userId: session.user.id, listId, type } },
  });

  let active: boolean;
  if (existing) {
    await db.listInteraction.delete({ where: { id: existing.id } });
    active = false;
  } else {
    await db.listInteraction.create({ data: { userId: session.user.id, listId, type } });
    active = true;
  }

  const counts = await countsFor(listId);
  return NextResponse.json({ active, counts });
}

// Returns counts plus which of the three interaction types the signed-in
// viewer currently has active on this list.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id: listId } = await params;

  const counts = await countsFor(listId);
  let viewerState = { LIKE: false, FAVORITE: false, BOOKMARK: false };
  if (session?.user?.id) {
    const mine = await db.listInteraction.findMany({ where: { userId: session.user.id, listId }, select: { type: true } });
    for (const row of mine) viewerState[row.type] = true;
  }

  return NextResponse.json({ counts, viewerState });
}
