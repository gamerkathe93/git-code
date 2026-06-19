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

  const releases = await db.release.findMany({
    where: { repoId: repo.id },
    include: { author: { select: { username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ releases });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only repo owner can create releases
  if (repo.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { tagName, name = "", body: releaseBody = "", isDraft = false, isPrerelease = false } = body;
  if (!tagName) return NextResponse.json({ error: "tagName is required" }, { status: 400 });

  const release = await db.release.create({
    data: {
      tagName,
      name,
      body: releaseBody,
      isDraft,
      isPrerelease,
      repoId: repo.id,
      authorId: session.userId,
    },
    include: { author: { select: { username: true, name: true } } },
  });

  return NextResponse.json({ release }, { status: 201 });
}
