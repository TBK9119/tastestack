import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { username } = await params;
  const target = await db.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.id === session.user.id) return NextResponse.json({ error: "Cannot follow yourself." }, { status: 400 });

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    create: { followerId: session.user.id, followingId: target.id },
    update: {},
  });
  return NextResponse.json({ following: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { username } = await params;
  const target = await db.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await db.follow.deleteMany({ where: { followerId: session.user.id, followingId: target.id } });
  return NextResponse.json({ following: false });
}
