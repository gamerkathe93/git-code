import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ repos: [], users: [], issues: [] });
  }

  const [repos, users, issues] = await Promise.all([
    db.repository.findMany({
      where: {
        isPrivate: false,
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        starsCount: true,
        language: true,
        owner: { select: { username: true } },
      },
      take: 5,
    }),
    db.user.findMany({
      where: {
        OR: [{ username: { contains: q } }, { name: { contains: q } }],
      },
      select: { id: true, username: true, name: true, avatarUrl: true },
      take: 5,
    }),
    db.issue.findMany({
      where: {
        repo: { isPrivate: false },
        title: { contains: q },
      },
      select: {
        id: true,
        number: true,
        title: true,
        state: true,
        repo: {
          select: {
            name: true,
            owner: { select: { username: true } },
          },
        },
      },
      take: 5,
    }),
  ]);

  return NextResponse.json({ repos, users, issues });
}
