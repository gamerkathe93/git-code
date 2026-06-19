import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string }> };

async function getRepo(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  return db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") || "open";
  const sort = searchParams.get("sort") || "newest";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { repoId: repo.id };
  if (state !== "all") where.state = state;

  const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };

  const pulls = await db.pullRequest.findMany({
    where,
    orderBy,
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { comments: true } },
    },
  });

  const open = await db.pullRequest.count({ where: { repoId: repo.id, state: "open" } });
  const closed = await db.pullRequest.count({ where: { repoId: repo.id, state: "closed" } });
  const merged = await db.pullRequest.count({ where: { repoId: repo.id, state: "merged" } });

  return NextResponse.json({
    pulls: pulls.map((p: any) => ({ ...p, commentsCount: p._count.comments })),
    total: pulls.length,
    open,
    closed,
    merged,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, body: prBody = "", headBranch, baseBranch, isDraft = false } = body;

  if (!title || !headBranch || !baseBranch) {
    return NextResponse.json({ error: "title, headBranch, and baseBranch are required" }, { status: 400 });
  }

  const maxNum = await db.pullRequest.findFirst({ where: { repoId: repo.id }, orderBy: { number: "desc" }, select: { number: true } });

  const pr = await db.pullRequest.create({
    data: {
      number: (maxNum?.number ?? 0) + 1,
      title,
      body: prBody,
      headBranch,
      baseBranch,
      isDraft,
      repoId: repo.id,
      authorId: session.userId,
    },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ pull: pr }, { status: 201 });
}
