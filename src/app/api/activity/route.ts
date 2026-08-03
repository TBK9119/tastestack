import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivityPage, ACTIVITY_PAGE_SIZE } from "@/lib/activity";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const take = Math.min(30, Math.max(1, Number(searchParams.get("take")) || ACTIVITY_PAGE_SIZE));

  const { activities, nextCursor } = await getActivityPage(session.user.id, cursor, take);
  return NextResponse.json({ activities, nextCursor });
}
