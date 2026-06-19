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
  const labelName = searchParams.get("label");
  const sort = searchParams.get("sort") || "newest";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { repoId: repo.id };
  if (state !== "all") where.state = state;
  if (labelName) {
    where.labels = { some: { label: { name: labelName } } };
  }

  const orderBy =
    sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };

  const issues = await db.issue.findMany({
    where,
    orderBy,
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      labels: { include: { label: true } },
      assignees: true,
      milestone: { select: { id: true, title: true } },
      _count: { select: { comments: true } },
    },
  });

  const [open, closed] = await Promise.all([
    db.issue.count({ where: { repoId: repo.id, state: "open" } }),
    db.issue.count({ where: { repoId: repo.id, state: "closed" } }),
  ]);

  return NextResponse.json({
    issues: issues.map((i: any) => ({
      ...i,
      labels: i.labels.map((il: any) => il.label),
      commentsCount: i._count.comments,
    })),
    total: issues.length,
    open,
    closed,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, body: issueBody = "", labelIds = [], milestoneId } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const maxNum = await db.issue.findFirst({ where: { repoId: repo.id }, orderBy: { number: "desc" }, select: { number: true } });

  const issue = await db.issue.create({
    data: {
      number: (maxNum?.number ?? 0) + 1,
      title,
      body: issueBody,
      repoId: repo.id,
      authorId: session.userId,
      milestoneId: milestoneId ?? null,
      labels: {
        create: labelIds.map((labelId: string) => ({ labelId })),
      },
    },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      labels: { include: { label: true } },
    },
  });

  return NextResponse.json({ issue }, { status: 201 });
}
