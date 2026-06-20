import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=missing_token", req.url));
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await (db as any).user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
    }

    await (db as any).user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/login?verified=1", appUrl));
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await (db as any).user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    await (db as any).user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
