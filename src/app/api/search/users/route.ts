import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const session = await getServerSession(authOptions);

  const users = await db.user.findMany({
    where: {
      AND: [
        { OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }] },
        // Private profiles are only discoverable by the account itself —
        // everyone else only ever sees public profiles in search.
        { OR: [{ isPublic: true }, { id: session?.user?.id || "" }] },
      ],
    },
    select: { username: true, displayName: true, avatarUrl: true, bannerColor: true, isPublic: true, _count: { select: { items: true, followers: true } } },
    take: 8,
  });

  // Exact/prefix username matches float to the top over mid-word or
  // display-name matches.
  const lower = q.toLowerCase();
  users.sort((a, b) => {
    const rank = (u: typeof a) => (u.username.toLowerCase() === lower ? 0 : u.username.toLowerCase().startsWith(lower) ? 1 : 2);
    return rank(a) - rank(b);
  });

  return NextResponse.json({ users });
}
