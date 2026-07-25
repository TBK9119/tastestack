import { prisma } from "@/lib/db";
import { MediaType, ItemStatus, MEDIA_TYPES } from "@/lib/constants";

export interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerColor: string;
  isPublic: boolean;
  isOwn: boolean;
  isFollowing: boolean;
  createdAt: Date;
  // stats per media type
  counts: Record<MediaType, number>;
  totalItems: number;
  favoritesCount: number;
  followersCount: number;
  followingCount: number;
}

export async function getProfileData(
  username: string,
  currentUserId?: string
): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: {
      _count: {
        select: { followers: true, following: true, items: true },
      },
    },
  });

  if (!user) return null;
  if (!user.isPublic && user.id !== currentUserId) return null;

  // Per-type counts in one query
  const typeCounts = await prisma.item.groupBy({
    by: ["type"],
    where: { userId: user.id },
    _count: true,
  });
  const counts: Partial<Record<MediaType, number>> = {};
  for (const row of typeCounts) {
    counts[row.type as MediaType] = row._count;
  }

  const favoritesCount = await prisma.item.count({
    where: { userId: user.id, isFavorite: true },
  });

  const isFollowing =
    Boolean(currentUserId) && user.id !== currentUserId
      ? Boolean(
          await prisma.follow.findUnique({
            where: {
              followerId_followingId: { followerId: currentUserId!, followingId: user.id },
            },
          })
        )
      : false;

  const fullCounts = MEDIA_TYPES.reduce((acc, m) => {
    acc[m.type] = counts[m.type] ?? 0;
    return acc;
  }, {} as Record<MediaType, number>);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerColor: user.bannerColor,
    isPublic: user.isPublic,
    isOwn: user.id === currentUserId,
    isFollowing,
    createdAt: user.createdAt,
    counts: fullCounts,
    totalItems: user._count.items,
    favoritesCount,
    followersCount: user._count.followers,
    followingCount: user._count.following,
  };
}

// Group items by status for a given media type, plus favorites.
export interface GroupedItems {
  watching: ItemSummary[];
  completed: ItemSummary[];
  planned: ItemSummary[];
  onhold: ItemSummary[];
  dropped: ItemSummary[];
  favorites: ItemSummary[];
}

export interface ItemSummary {
  id: string;
  type: MediaType;
  title: string;
  coverUrl: string;
  year: string;
  status: ItemStatus;
  rating: number;
  progressCurrent: number;
  progressTotal: number;
  isFavorite: boolean;
  review: string;
}

export async function getItemsByType(
  userId: string,
  type: MediaType
): Promise<GroupedItems> {
  const items = await prisma.item.findMany({
    where: { userId, type },
    orderBy: [{ updatedAt: "desc" }],
  });

  const summaries: ItemSummary[] = items.map((i) => ({
    id: i.id,
    type: i.type as MediaType,
    title: i.title,
    coverUrl: i.coverUrl,
    year: i.year,
    status: i.status as ItemStatus,
    rating: i.rating,
    progressCurrent: i.progressCurrent,
    progressTotal: i.progressTotal,
    isFavorite: i.isFavorite,
    review: i.review,
  }));

  const empty = (s: ItemStatus) => summaries.filter((i) => i.status === s);
  return {
    watching: empty("watching"),
    completed: empty("completed"),
    planned: empty("planned"),
    onhold: empty("onhold"),
    dropped: empty("dropped"),
    favorites: summaries.filter((i) => i.isFavorite),
  };
}
