import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, username, email, password } = await req.json();

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, hyphens, and underscores" }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      },
    });

    const token = await createToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    const response = NextResponse.json(
      { user: { id: user.id, username: user.username, email: user.email, name: user.name } },
      { status: 201 }
    );
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
