import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";
import { sendEmail, emailTemplate } from "@/lib/email";

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

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await (db as any).user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        passwordResetToken: verifyTokenHash,
        passwordResetExpiry: verifyExpiry,
      },
    });

    // Send verification email (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    sendEmail({
      to: email,
      subject: "Verify your GitCode email",
      html: emailTemplate(
        "Verify your email",
        "<p>Welcome to GitCode! Click below to verify your email address.</p><p>This link expires in 24 hours.</p>",
        "Verify email",
        `${appUrl}/api/auth/verify-email?token=${verifyToken}`
      ),
    }).catch(() => {});

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
