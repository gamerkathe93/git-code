import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await (db as any).personalAccessToken.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      name: true,
      scopes: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, scopes, expiresAt } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Token name is required" }, { status: 400 });
  }

  const rawToken = "gitcode_" + crypto.randomBytes(16).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = rawToken.slice(0, 15);

  const record = await (db as any).personalAccessToken.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      tokenHash,
      tokenPrefix,
      scopes: Array.isArray(scopes) ? scopes.join(",") : (scopes ?? ""),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      scopes: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ token: rawToken, record }, { status: 201 });
}
