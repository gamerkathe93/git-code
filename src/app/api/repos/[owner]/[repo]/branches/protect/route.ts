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
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  const protections = await (db as any).branchProtection.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ protections });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  const body = await req.json();
  const {
    pattern,
    requirePullRequest = false,
    requiredApprovals = 1,
    requireStatusChecks = false,
    dismissStaleReviews = false,
    allowForcePush = false,
  } = body;

  if (!pattern) return NextResponse.json({ error: "pattern is required" }, { status: 400 });

  const protection = await (db as any).branchProtection.upsert({
    where: { repoId_pattern: { repoId: repo.id, pattern } },
    create: {
      repoId: repo.id,
      pattern,
      requirePullRequest,
      requiredApprovals,
      requireStatusChecks,
      dismissStaleReviews,
      allowForcePush,
    },
    update: {
      requirePullRequest,
      requiredApprovals,
      requireStatusChecks,
      dismissStaleReviews,
      allowForcePush,
    },
  });

  return NextResponse.json({ protection }, { status: 201 });
}
