import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

async function getPR(owner: string, repoName: string, number: number) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return null;
  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number } },
  });
  return pr;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const pr = await getPR(owner, repoName, parseInt(number));
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reviewers = await (db as any).pRReviewer.findMany({
    where: { pullRequestId: pr.id },
    include: {
      reviewer: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ reviewers });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const pr = await getPR(owner, repoName, parseInt(number));
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const reviewerUser = await db.user.findUnique({ where: { username } });
  if (!reviewerUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const reviewer = await (db as any).pRReviewer.upsert({
    where: { pullRequestId_reviewerId: { pullRequestId: pr.id, reviewerId: reviewerUser.id } },
    create: { pullRequestId: pr.id, reviewerId: reviewerUser.id, state: "requested" },
    update: { state: "requested" },
    include: {
      reviewer: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ reviewer }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const pr = await getPR(owner, repoName, parseInt(number));
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const reviewerUser = await db.user.findUnique({ where: { username } });
  if (!reviewerUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await (db as any).pRReviewer.findUnique({
    where: { pullRequestId_reviewerId: { pullRequestId: pr.id, reviewerId: reviewerUser.id } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await (db as any).pRReviewer.delete({
    where: { pullRequestId_reviewerId: { pullRequestId: pr.id, reviewerId: reviewerUser.id } },
  });

  return NextResponse.json({ success: true });
}
