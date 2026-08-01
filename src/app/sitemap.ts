import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = "https://tastestack.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // Every public profile gets its own indexable URL now that profiles are
  // real routes (/profile/[username]) instead of client-side view state —
  // this is what actually gets individual users found on Google, not just
  // the homepage.
  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const users = await db.user.findMany({
      where: { isPublic: true },
      select: { username: true, updatedAt: true },
      take: 5000,
    });
    profileRoutes = users.map((u) => ({
      url: `${siteUrl}/profile/${u.username}`,
      lastModified: u.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB unreachable at build time — ship the static routes rather than
    // failing the whole sitemap.
  }

  return [...staticRoutes, ...profileRoutes];
}
