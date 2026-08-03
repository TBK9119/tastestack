import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request.headers);
    const limit = rateLimit(`signup:${ip}`, 5, 10 * 60 * 1000); // 5 signups / 10 min / IP
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    }

    const body = await request.json();
    const { email, username, displayName, password } = body;

    if (!email || !username || !displayName || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim().replace(/\s+/g, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(normalizedUsername)) {
      return NextResponse.json({ error: "Username must be 3-20 characters (letters, numbers, underscore)." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
    });
    if (existing) {
      if (existing.email === normalizedEmail) {
        return NextResponse.json({ error: "Email already registered." }, { status: 409 });
      }
      return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { email: normalizedEmail, username: normalizedUsername, displayName: displayName.trim(), passwordHash },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
