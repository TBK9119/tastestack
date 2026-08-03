import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchTrendingAniList } from "@/lib/api/anilist";
import { fetchTrendingOpenLibrary } from "@/lib/api/openlibrary";
import { mediaConfig, type MediaType } from "@/lib/constants";

interface RecCard {
  type: MediaType; apiId: string; source: string;
  title: string; creator: string; year: string; coverUrl: string;
  reason: string;
}

type ItemRow = { type: string; apiId: string; source: string; title: string; coverUrl: string; year: string; extra: string };

function extraCreator(extra: string): string {
  try { return JSON.parse(extra || "{}").creator || "Unknown"; } catch { return "Unknown"; }
}

// Groups denormalized Item rows by their (type, source, apiId) identity and
// counts how often each appears — e.g. how many followed users have a title
// favourited/highly rated. Items the viewer already owns are excluded so
// recommendations never suggest something already tracked.
function aggregate(rows: ItemRow[], ownedKeys: Set<string>, reason: string): RecCard[] {
  const byKey = new Map<string, { row: ItemRow; count: number }>();
  for (const row of rows) {
    const key = `${row.type}:${row.source}:${row.apiId}`;
    if (ownedKeys.has(key)) continue;
    const entry = byKey.get(key);
    if (entry) entry.count += 1;
    else byKey.set(key, { row, count: 1 });
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(({ row }) => ({
      type: row.type as MediaType, apiId: row.apiId, source: row.source,
      title: row.title, creator: extraCreator(row.extra), year: row.year, coverUrl: row.coverUrl,
      reason,
    }));
}

// The only two free/live trending sources (see lib/constants.ts — movie/tv/
// game/album all require an API key not yet configured). Recommendations
// stay honest about what's actually available rather than recommending
// titles from a source with no live data behind it.
const LIVE_TRENDABLE: MediaType[] = ["anime", "manga", "book"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ social: [], community: [], forYou: [] });
  const uid = session.user.id;

  const myItems = await db.item.findMany({
    where: { userId: uid },
    select: { type: true, apiId: true, source: true, rating: true },
  });
  const ownedKeys = new Set(myItems.map((i) => `${i.type}:${i.source}:${i.apiId}`));

  const following = await db.follow.findMany({ where: { followerId: uid }, select: { followingId: true } });
  const followingIds = following.map((f) => f.followingId);

  const [socialRows, communityRows] = await Promise.all([
    followingIds.length
      ? db.item.findMany({
          where: { userId: { in: followingIds }, OR: [{ isFavorite: true }, { rating: { gte: 7 } }] },
          select: { type: true, apiId: true, source: true, title: true, coverUrl: true, year: true, extra: true },
          orderBy: { updatedAt: "desc" },
          take: 300,
        })
      : Promise.resolve([] as ItemRow[]),
    db.item.findMany({
      where: { user: { isPublic: true }, OR: [{ isFavorite: true }, { rating: { gte: 7 } }] },
      select: { type: true, apiId: true, source: true, title: true, coverUrl: true, year: true, extra: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const social = aggregate(socialRows, ownedKeys, "Liked by people you follow");
  // Don't repeat a title already surfaced in "social" — keep the two lists
  // complementary rather than redundant.
  const socialKeys = new Set(social.map((r) => `${r.type}:${r.source}:${r.apiId}`));
  const community = aggregate(communityRows, ownedKeys, "Trending on TasteStack").filter((r) => !socialKeys.has(`${r.type}:${r.source}:${r.apiId}`));

  // Type affinity: rate = count weighted by how highly the person tends to
  // rate that type, so a type they've rated well (even with few entries)
  // can outrank one they have lots of but rate indifferently.
  const byType = new Map<string, { count: number; ratedSum: number; ratedCount: number }>();
  for (const it of myItems) {
    const bucket = byType.get(it.type) || { count: 0, ratedSum: 0, ratedCount: 0 };
    bucket.count += 1;
    if (it.rating > 0) { bucket.ratedSum += it.rating; bucket.ratedCount += 1; }
    byType.set(it.type, bucket);
  }
  const rankedTypes = Array.from(byType.entries())
    .map(([type, b]) => ({ type: type as MediaType, score: b.count + (b.ratedCount ? (b.ratedSum / b.ratedCount) * 2 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.type)
    .filter((t) => LIVE_TRENDABLE.includes(t));

  let forYou: RecCard[] = [];
  const topType = rankedTypes[0];
  if (topType === "anime" || topType === "manga") {
    const trending = await fetchTrendingAniList(topType, "SCORE_DESC");
    forYou = trending
      .filter((r) => !ownedKeys.has(`${r.type}:${r.source}:${r.apiId}`))
      .slice(0, 8)
      .map((r) => ({ type: r.type, apiId: r.apiId, source: r.source, title: r.title, creator: r.creator, year: r.year, coverUrl: r.coverUrl, reason: `Because you rate ${mediaConfig(topType).label} highly` }));
  } else if (topType === "book") {
    const trending = await fetchTrendingOpenLibrary("forever");
    forYou = trending
      .filter((r) => !ownedKeys.has(`${r.type}:${r.source}:${r.apiId}`))
      .slice(0, 8)
      .map((r) => ({ type: r.type, apiId: r.apiId, source: r.source, title: r.title, creator: r.creator, year: r.year, coverUrl: r.coverUrl, reason: `Because you rate ${mediaConfig(topType).label} highly` }));
  }

  return NextResponse.json({ social, community, forYou });
}
