import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, name: true, bio: true, avatarUrl: true,
      website: true, company: true, location: true, createdAt: true,
      _count: { select: { repositories: true, stars: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const repos = await db.repository.findMany({
    where: { ownerId: user.id, isPrivate: false },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { username: true } }, _count: { select: { stars: true } } },
    take: 10,
  });

  return NextResponse.json({ user, repos });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  if (session.username !== username) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const allowed = ["name", "bio", "location", "website", "company"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const updated = await db.user.update({ where: { username }, data: updates });
  return NextResponse.json({ user: updated });
}
