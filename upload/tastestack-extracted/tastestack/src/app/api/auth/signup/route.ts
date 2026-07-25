import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    const username = (body.username || "").toString().trim();
    const displayName = (body.displayName || "").toString().trim();
    const password = (body.password || "").toString();

    // --- validation ---
    if (!email || !username || !displayName || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters: letters, numbers, or underscore.",
        },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // --- uniqueness checks ---
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 400 }
      );
    }
    const usernameTaken = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (usernameTaken) {
      return NextResponse.json(
        { error: "Username is taken." },
        { status: 400 }
      );
    }

    // --- create user ---
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username: username.toLowerCase(),
        displayName,
        passwordHash,
      },
    });

    return NextResponse.json({ id: user.id, username: user.username });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
