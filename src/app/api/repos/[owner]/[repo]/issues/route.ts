import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string }> };

async function getRepo(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  return repo ? { ownerUser, repo } : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const resolved = await getRepo(owner, repoName);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { repo } = resolved;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    issues: issues.map((i: any) => ({
      ...i,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const resolved = await getRepo(owner, repoName);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { ownerUser, repo } = resolved;

  const body = await req.json();
  const { title, body: issueBody = "", labelIds = [], milestoneId } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const maxNum = await db.issue.findFirst({
    where: { repoId: repo.id },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = (maxNum?.number ?? 0) + 1;

  const issue = await db.issue.create({
    data: {
      number: nextNumber,
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

  // Notify repo owner if the issue author is not the owner
  if (ownerUser.id !== session.userId) {
    await db.notification.create({
      data: {
        userId: ownerUser.id,
        type: "issue",
        title: `New issue: ${title}`,
        body: `${session.username} opened issue #${nextNumber} in ${repoName}`,
        url: `/${owner}/${repoName}/issues/${nextNumber}`,
      },
    });
  }

  return NextResponse.json({ issue }, { status: 201 });
}
