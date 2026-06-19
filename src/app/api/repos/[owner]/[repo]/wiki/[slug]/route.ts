import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; slug: string }> };

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

  const { owner, repo: repoName, slug } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const page = await db.wikiPage.findUnique({
    where: { repoId_slug: { repoId: repo.id, slug } },
    include: { author: { select: { username: true, name: true } } },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ page });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, slug } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (repo.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.wikiPage.findUnique({
    where: { repoId_slug: { repoId: repo.id, slug } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, content } = body;

  const page = await db.wikiPage.update({
    where: { repoId_slug: { repoId: repo.id, slug } },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
    include: { author: { select: { username: true, name: true } } },
  });

  return NextResponse.json({ page });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, slug } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (repo.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.wikiPage.findUnique({
    where: { repoId_slug: { repoId: repo.id, slug } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.wikiPage.delete({
    where: { repoId_slug: { repoId: repo.id, slug } },
  });

  return NextResponse.json({ success: true });
}
