import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

async function getRepoAndIssue(owner: string, repoName: string, number: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return null;
  // Re-fetch with full includes
  const issue = await db.issue.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
  });
  return issue ? { repo, issue } : null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo, number } = await params;
  const result = await getRepoAndIssue(owner, repo, number);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Re-fetch with full includes
  const issue = await db.issue.findUnique({
    where: { id: result.issue.id },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      labels: { include: { label: true } },
      milestone: true,
      comments: { include: { author: { select: { username: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo, number } = await params;
  const result = await getRepoAndIssue(owner, repo, number);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, state, milestoneId, labelIds } = body;

  const updated = await db.issue.update({
    where: { id: result.issue.id },
    data: {
      ...(title && { title }),
      ...(state && { state, closedAt: state === "closed" ? new Date() : null }),
      ...(milestoneId !== undefined && { milestoneId }),
    },
  });

  return NextResponse.json({ issue: updated });
}
