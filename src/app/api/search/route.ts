import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";

  if (!q) return NextResponse.json({ results: {}, total: 0 });

  const results: Record<string, unknown[]> = {};
  let total = 0;

  if (type === "all" || type === "repos") {
    const repos = await db.repository.findMany({
      where: {
        isPrivate: false,
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      include: { owner: { select: { username: true, avatarUrl: true } } },
      take: 10,
    });
    results.repos = repos;
    total += repos.length;
  }

  if (type === "all" || type === "users") {
    const users = await db.user.findMany({
      where: {
        OR: [{ username: { contains: q } }, { name: { contains: q } }],
      },
      select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
      take: 10,
    });
    results.users = users;
    total += users.length;
  }

  if (type === "all" || type === "issues") {
    const issues = await db.issue.findMany({
      where: {
        repo: { isPrivate: false },
        OR: [{ title: { contains: q } }, { body: { contains: q } }],
      },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        repo: { include: { owner: { select: { username: true } } } },
      },
      take: 10,
    });
    results.issues = issues;
    total += issues.length;
  }

  return NextResponse.json({ results, total, query: q });
}
