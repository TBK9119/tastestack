import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  images: {
    // Cover art already arrives pre-sized from each source's own CDN
    // (AniList/TMDB/RAWG/Last.fm/OpenLibrary) — there's nothing to gain from
    // re-encoding it through Vercel's Image Optimization pipeline, and that
    // pipeline is metered separately from bandwidth (5,000 transformations a
    // month on the Hobby plan). Every *unique* remote image a visitor loads
    // counts once against that quota, so it fills up fast once real traffic
    // shows up. Serving these directly with `unoptimized` skips the
    // pipeline entirely — zero transformations, regardless of traffic.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

export default nextConfig;
