import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgs = await db.organization.findMany({
    where: { members: { some: { userId: session.userId } } },
    include: { _count: { select: { members: true } }, owner: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orgs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, displayName, description } = await req.json();

  if (!name || !displayName) {
    return NextResponse.json({ error: "Name and display name are required" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: "Name may only contain lowercase letters, numbers, and hyphens" }, { status: 400 });
  }

  const existing = await db.organization.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "Organization name already taken" }, { status: 409 });

  const org = await db.organization.create({
    data: {
      name,
      displayName,
      description: description ?? "",
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      ownerId: session.userId,
      members: { create: { userId: session.userId, role: "owner" } },
    },
  });

  return NextResponse.json({ org }, { status: 201 });
}
