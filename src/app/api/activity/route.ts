import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const following = await db.follow.findMany({ where: { followerId: session.user.id }, select: { followingId: true } });
  const userIds = [session.user.id, ...following.map((f) => f.followingId)];

  const activities = await db.activity.findMany({
    where: { userId: { in: userIds } },
    include: {
      item: { select: { id: true, title: true, type: true, coverUrl: true, extra: true } },
      user: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ activities });
}
