import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const STATUSES = ["watching", "completed", "planned", "dropped", "onhold"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await params;
  const existing = await db.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json();
  const data: Record<string, any> = {};

  if (body.status !== undefined) data.status = STATUSES.includes(body.status) ? body.status : existing.status;
  if (body.rating !== undefined) { const r = Math.round(Number(body.rating)); data.rating = Number.isFinite(r) ? Math.max(0, Math.min(10, r)) : existing.rating; }
  if (body.progressCurrent !== undefined) { const v = Math.round(Number(body.progressCurrent)); data.progressCurrent = Number.isFinite(v) ? Math.max(0, v) : existing.progressCurrent; }
  if (body.progressTotal !== undefined) { const v = Math.round(Number(body.progressTotal)); data.progressTotal = Number.isFinite(v) ? Math.max(0, v) : existing.progressTotal; }
  if (body.review !== undefined) data.review = String(body.review).slice(0, 500);
  if (body.isFavorite !== undefined) data.isFavorite = Boolean(body.isFavorite);

  const updated = await db.item.update({ where: { id }, data });

  let action: string | null = null;
  if (data.status === "completed" && existing.status !== "completed") action = "completed";
  else if (data.isFavorite === true && !existing.isFavorite) action = "favorited";
  else if (typeof data.rating === "number" && data.rating > 0 && data.rating !== existing.rating) action = "rated";
  else if (typeof data.review === "string" && data.review && data.review !== existing.review) action = "reviewed";
  if (action) await db.activity.create({ data: { userId: existing.userId, itemId: updated.id, action } });

  return NextResponse.json({ item: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { id } = await params;
  const existing = await db.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await db.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
