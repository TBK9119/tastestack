import { db } from "@/lib/db";

export const ACTIVITY_PAGE_SIZE = 15;

// Cursor pagination (id-based, tie-broken on createdAt) so each page is a
// fixed-cost index lookup regardless of how deep someone scrolls — unlike
// OFFSET-based paging, which gets slower the further back you go.
export async function getActivityPage(userId: string, cursor?: string | null, take: number = ACTIVITY_PAGE_SIZE) {
  const following = await db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const userIds = [userId, ...following.map((f) => f.followingId)];

  const rows = await db.activity.findMany({
    where: { userId: { in: userIds } },
    include: {
      item: { select: { id: true, title: true, type: true, coverUrl: true, extra: true } },
      user: { select: { username: true, displayName: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const activities = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? activities[activities.length - 1].id : null;
  return { activities, nextCursor };
}
