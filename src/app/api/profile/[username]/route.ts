import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    include: { _count: { select: { followers: true, following: true, items: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const isOwn = session?.user?.id === user.id;
  if (!user.isPublic && !isOwn) return NextResponse.json({ error: "Profile is private." }, { status: 403 });

  let isFollowing = false;
  if (session?.user?.id && !isOwn) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  const typeCounts = await db.item.groupBy({ by: ["type"], where: { userId: user.id }, _count: true });
  const counts: Record<string, number> = {};
  for (const row of typeCounts) counts[row.type] = row._count;
  const favoritesCount = await db.item.count({ where: { userId: user.id, isFavorite: true } });

  const ratingDistribution = await db.item.groupBy({ by: ["rating"], where: { userId: user.id, rating: { gt: 0 } }, _count: true });
  const ratings: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratings[i] = 0; // Initialize 1-10
  for (const row of ratingDistribution) ratings[row.rating] = row._count;

  return NextResponse.json({
    id: user.id, username: user.username, displayName: user.displayName, bio: user.bio,
    avatarUrl: user.avatarUrl, bannerColor: user.bannerColor, isPublic: user.isPublic,
    isOwn, isFollowing, counts, ratings, totalItems: user._count.items,
    favoritesCount, followersCount: user._count.followers, followingCount: user._count.following,
  });
}
