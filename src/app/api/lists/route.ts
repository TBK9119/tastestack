import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const usernameParam = searchParams.get("username");
  const session = await getServerSession(authOptions);

  let targetUserId: string;
  let isOwn: boolean;

  if (usernameParam) {
    const targetUser = await db.user.findUnique({ where: { username: usernameParam.toLowerCase() }, select: { id: true, isPublic: true } });
    if (!targetUser) return NextResponse.json({ lists: [] });
    isOwn = session?.user?.id === targetUser.id;
    if (!targetUser.isPublic && !isOwn) return NextResponse.json({ lists: [] });
    targetUserId = targetUser.id;
  } else {
    if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    targetUserId = session.user.id;
    isOwn = true;
  }

  const lists = await db.list.findMany({
    where: { userId: targetUserId, ...(isOwn ? {} : { isPublic: true }) },
    orderBy: { updatedAt: "desc" },
    include: {
      entries: { orderBy: { position: "asc" }, take: 4 },
      _count: { select: { entries: true } },
    },
  });

  return NextResponse.json({ lists });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = await request.json();
  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Give your list a name." }, { status: 400 });

  let list;
  try {
    list = await db.list.create({
      data: {
        userId: session.user.id,
        name,
        description: String(body.description || "").trim().slice(0, 240),
        isPublic: body.isPublic !== false,
      },
      include: { entries: true, _count: { select: { entries: true } } },
    });
  } catch (err: any) {
    console.error("List create error:", err);
    const hint = err?.code === "P2021" ? " (the lists table isn't in the database yet — run `npm run db:push`)" : "";
    return NextResponse.json({ error: `Could not create list.${hint}` }, { status: 500 });
  }

  return NextResponse.json({ list });
}
