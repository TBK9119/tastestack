import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUSES = ["watching", "completed", "planned", "dropped", "onhold"];

type PatchBody = {
  status?: string;
  rating?: number;
  progressCurrent?: number;
  progressTotal?: number;
  review?: string;
  isFavorite?: boolean;
};

// Update status, rating, progress, review, or favourite flag on an item.
// Only the owner of an item may edit it.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Title not found." }, { status: 404 });
  }

  const body = (await request.json()) as PatchBody;
  const data: {
    status?: string;
    rating?: number;
    progressCurrent?: number;
    progressTotal?: number;
    review?: string;
    isFavorite?: boolean;
  } = {};

  if (body.status !== undefined) {
    data.status = STATUSES.includes(body.status) ? body.status : existing.status;
  }
  if (body.rating !== undefined) {
    const rating = Math.round(Number(body.rating));
    data.rating = Number.isFinite(rating) ? Math.max(0, Math.min(10, rating)) : existing.rating;
  }
  if (body.progressCurrent !== undefined) {
    const value = Math.round(Number(body.progressCurrent));
    data.progressCurrent = Number.isFinite(value) ? Math.max(0, value) : existing.progressCurrent;
  }
  if (body.progressTotal !== undefined) {
    const value = Math.round(Number(body.progressTotal));
    data.progressTotal = Number.isFinite(value) ? Math.max(0, value) : existing.progressTotal;
  }
  if (body.review !== undefined) {
    data.review = String(body.review).slice(0, 500);
  }
  if (body.isFavorite !== undefined) {
    data.isFavorite = Boolean(body.isFavorite);
  }

  const updated = await prisma.item.update({
    where: { id: params.id },
    data,
  });

  // Log the most meaningful change for the activity feed (one entry per save).
  let action: string | null = null;
  if (data.status === "completed" && existing.status !== "completed") action = "completed";
  else if (data.isFavorite === true && !existing.isFavorite) action = "favorited";
  else if (typeof data.rating === "number" && data.rating > 0 && data.rating !== existing.rating) action = "rated";
  else if (typeof data.review === "string" && data.review && data.review !== existing.review) action = "reviewed";

  if (action) {
    await prisma.activity.create({
      data: { userId: session.user.id, itemId: updated.id, action },
    });
  }

  return NextResponse.json({ item: updated });
}

// Remove an item from the caller's stack entirely.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const existing = await prisma.item.findUnique({ where: { id: params.id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Title not found." }, { status: 404 });
  }

  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
