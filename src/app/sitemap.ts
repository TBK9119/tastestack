import type { MetadataRoute } from "next";

const siteUrl = "https://tastestack.vercel.app";

// NOTE: TasteStack is currently a single-URL SPA (everything lives at "/").
// Once profile/discover pages get real routes (see the routing fix we
// discussed), add one entry per public profile here — that's what actually
// gets individual users' pages into Google, not just the homepage.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
