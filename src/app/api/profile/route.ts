import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { displayName: true, bio: true, avatarUrl: true, bannerColor: true, isPublic: true, username: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = await request.json();
  const data: Record<string, any> = {};
  if (typeof body.displayName === "string") data.displayName = body.displayName.trim().slice(0, 40);
  if (typeof body.bio === "string") data.bio = body.bio.trim().slice(0, 240);
  if (typeof body.bannerColor === "string") data.bannerColor = body.bannerColor;
  if (typeof body.isPublic === "boolean") data.isPublic = body.isPublic;
  if (typeof body.avatarUrl === "string") {
    if (body.avatarUrl === "") {
      data.avatarUrl = "";
    } else if (body.avatarUrl.startsWith("data:image/") && body.avatarUrl.length <= 500_000) {
      data.avatarUrl = body.avatarUrl;
    } else {
      return NextResponse.json({ error: "That image couldn't be processed — try a smaller picture." }, { status: 400 });
    }
  }
  if (typeof body.username === "string") {
    const normalized = body.username.toLowerCase().trim().replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(normalized)) {
      return NextResponse.json({ error: "Username must be 3-20 characters (letters, numbers, underscore)." }, { status: 400 });
    }
    if (normalized !== session.user.username) {
      const clash = await db.user.findUnique({ where: { username: normalized } });
      if (clash) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      data.username = normalized;
    }
  }

  const updated = await db.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({
    displayName: updated.displayName, bio: updated.bio, avatarUrl: updated.avatarUrl,
    bannerColor: updated.bannerColor, isPublic: updated.isPublic, username: updated.username,
  });
}
