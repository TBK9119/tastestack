import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const list = await db.list.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, displayName: true } },
      entries: { orderBy: { position: "asc" } },
    },
  });
  if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const isOwn = Boolean(session?.user?.id && list.userId === session.user.id);
  if (!list.isPublic && !isOwn) return NextResponse.json({ error: "List not found." }, { status: 404 });

  const [grouped, viewerRows] = await Promise.all([
    db.listInteraction.groupBy({ by: ["type"], where: { listId: id }, _count: true }),
    session?.user?.id
      ? db.listInteraction.findMany({ where: { userId: session.user.id, listId: id }, select: { type: true } })
      : Promise.resolve([]),
  ]);
  const counts = { LIKE: 0, FAVORITE: 0, BOOKMARK: 0 };
  for (const row of grouped) counts[row.type] = row._count;
  const viewerState = { LIKE: false, FAVORITE: false, BOOKMARK: false };
  for (const row of viewerRows) viewerState[row.type] = true;

  return NextResponse.json({ list: { ...list, isOwn, counts, viewerState } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await params;
  const existing = await db.list.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json();
  const data: Record<string, any> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "Give your list a name." }, { status: 400 });
    data.name = name;
  }
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 240);
  if (body.isPublic !== undefined) data.isPublic = Boolean(body.isPublic);

  const list = await db.list.update({ where: { id }, data, include: { entries: { orderBy: { position: "asc" } } } });
  return NextResponse.json({ list });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await params;
  const existing = await db.list.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await db.list.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
