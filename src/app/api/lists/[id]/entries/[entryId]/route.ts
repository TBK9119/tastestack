import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function assertOwnership(listId: string, userId: string) {
  const list = await db.list.findUnique({ where: { id: listId } });
  if (!list) return { error: NextResponse.json({ error: "List not found." }, { status: 404 }) };
  if (list.userId !== userId) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { list };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id: listId, entryId } = await params;
  const { error } = await assertOwnership(listId, session.user.id);
  if (error) return error;

  const body = await request.json();
  const entry = await db.listEntry.update({ where: { id: entryId }, data: { note: String(body.note || "").slice(0, 240) } });
  return NextResponse.json({ entry });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id: listId, entryId } = await params;
  const { error } = await assertOwnership(listId, session.user.id);
  if (error) return error;

  await db.listEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
