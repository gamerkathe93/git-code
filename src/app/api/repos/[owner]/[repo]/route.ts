import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasAnyCommit, getTree, getCommits, getDefaultBranch, getCloneUrls } from "@/lib/git";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
    include: {
      owner: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { issues: true, pullRequests: true, stars: true } },
    },
  });

  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  if (repo.isPrivate && session.username !== owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasCommits = await hasAnyCommit(owner, repoName);
  const branch = searchParams(req, "ref") || repo.defaultBranch;
  const subPath = searchParams(req, "path") || "";

  const tree = hasCommits ? await getTree(owner, repoName, branch, subPath) : [];
  const commits = hasCommits ? await getCommits(owner, repoName, branch, 5) : [];
  const cloneUrls = getCloneUrls(owner, repoName, process.env.NEXT_PUBLIC_APP_URL);

  return NextResponse.json({
    repo: {
      ...repo,
      starsCount: repo._count.stars,
      openIssues: repo._count.issues,
      openPRs: repo._count.pullRequests,
      topics: JSON.parse(repo.topics || "[]"),
      hasCommits,
    },
    tree,
    latestCommit: commits[0] ?? null,
    cloneUrls,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await db.repository.update({
    where: { id: repo.id },
    data: {
      description: body.description ?? repo.description,
      isPrivate: body.isPrivate ?? repo.isPrivate,
      hasIssues: body.hasIssues ?? repo.hasIssues,
      hasWiki: body.hasWiki ?? repo.hasWiki,
      topics: body.topics ? JSON.stringify(body.topics) : repo.topics,
      defaultBranch: body.defaultBranch ?? repo.defaultBranch,
    },
  });

  return NextResponse.json({ repo: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.repository.deleteMany({
    where: { ownerId: ownerUser.id, name: repoName },
  });

  return NextResponse.json({ message: "Repository deleted" });
}

function searchParams(req: NextRequest, key: string): string {
  return new URL(req.url).searchParams.get(key) ?? "";
}
