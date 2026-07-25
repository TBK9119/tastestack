import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const target = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: target.id },
    },
    update: {},
    create: { followerId: session.user.id, followingId: target.id },
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const target = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: target.id },
  });

  return NextResponse.json({ following: false });
}
