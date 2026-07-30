import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchAniList } from "@/lib/api/anilist";
import { searchTMDB } from "@/lib/api/tmdb";
import { searchOpenLibrary } from "@/lib/api/openlibrary";

// Imports run in small client-driven batches (see ImportSection.tsx) rather
// than one giant request, both for a live progress bar and to stay well
// under serverless function time limits. Matches within a batch run in
// parallel so one batch's duration is bounded by the slowest single lookup,
// not the sum of all of them.
export const maxDuration = 60;

const STATUSES = ["watching", "completed", "planned", "dropped", "onhold"];
const MAX_BATCH = 8;

interface ImportEntry {
  title: string;
  year?: string;
  status: string;
  rating: number;
  progressCurrent: number;
  progressTotal: number;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const uid = session.user.id;

  const body = await request.json();
  const type = body.type;
  if (!["anime", "manga", "movie", "book"].includes(type)) {
    return NextResponse.json({ error: "Unsupported import type." }, { status: 400 });
  }
  if (type === "movie" && !process.env.TMDB_API_KEY) {
    return NextResponse.json({ error: "Movie import needs a TMDB API key configured on the server." }, { status: 400 });
  }

  const entries: ImportEntry[] = Array.isArray(body.entries) ? body.entries.slice(0, MAX_BATCH) : [];
  if (!entries.length) return NextResponse.json({ error: "No entries to import." }, { status: 400 });

  const results = await Promise.all(entries.map(async (entry) => {
    const title = String(entry.title || "").trim().slice(0, 200);
    if (!title) return { title: entry.title || "", status: "error" as const };

    let match: { apiId: string; source: string; title: string; year: string; coverUrl: string; creator: string; progressTotal: number } | null = null;

    try {
      if (type === "anime" || type === "manga") {
        const found = await searchAniList(title, type);
        if (found[0]) match = found[0];
      } else if (type === "movie") {
        const found = await searchTMDB(title, "movie");
        match = (entry.year ? found.find((r) => r.year === entry.year) : undefined) || found[0] || null;
      } else if (type === "book") {
        const found = await searchOpenLibrary(title);
        if (found[0]) match = found[0];
      }
    } catch {
      match = null;
    }

    if (!match) return { title, status: "no-match" as const };

    const status = STATUSES.includes(entry.status) ? entry.status : "planned";
    const rating = Math.max(0, Math.min(10, Math.round(Number(entry.rating) || 0)));
    const progressCurrent = Math.max(0, Math.round(Number(entry.progressCurrent) || 0));
    const progressTotal = Math.max(0, Math.round(Number(entry.progressTotal) || match.progressTotal || 0));

    try {
      const item = await db.item.upsert({
        where: { userId_type_apiId_source: { userId: uid, type, apiId: match.apiId, source: match.source } },
        update: { status, rating, progressCurrent, progressTotal },
        create: {
          userId: uid, type, apiId: match.apiId, source: match.source,
          title: match.title, year: match.year, coverUrl: match.coverUrl,
          extra: JSON.stringify({ creator: match.creator }),
          status, rating, progressCurrent, progressTotal,
        },
      });
      return { title: match.title, status: "imported" as const, coverUrl: match.coverUrl, itemId: item.id };
    } catch {
      return { title, status: "error" as const };
    }
  }));

  // Deliberately no Activity rows here — a bulk import firing one feed
  // entry per title would spam followers. Organic single adds from
  // Discover still log activity as normal.
  return NextResponse.json({ results });
}
