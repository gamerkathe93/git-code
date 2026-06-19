import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string }> };

async function getRepo(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  return db.repository.findUnique({ where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.star.findUnique({
    where: { userId_repoId: { userId: session.userId, repoId: repo.id } },
  });

  if (existing) {
    await db.star.delete({ where: { userId_repoId: { userId: session.userId, repoId: repo.id } } });
    const count = await db.star.count({ where: { repoId: repo.id } });
    await db.repository.update({ where: { id: repo.id }, data: { starsCount: count } });
    return NextResponse.json({ starred: false, starsCount: count });
  }

  await db.star.create({ data: { userId: session.userId, repoId: repo.id } });
  const count = await db.star.count({ where: { repoId: repo.id } });
  await db.repository.update({ where: { id: repo.id }, data: { starsCount: count } });
  return NextResponse.json({ starred: true, starsCount: count });
}
