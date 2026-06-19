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

  const pages = await db.wikiPage.findMany({
    where: { repoId: repo.id },
    include: { author: { select: { username: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only repo owner can create wiki pages
  if (repo.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { slug, title, content = "" } = body;
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const page = await db.wikiPage.create({
    data: {
      slug,
      title,
      content,
      repoId: repo.id,
      authorId: session.userId,
    },
    include: { author: { select: { username: true, name: true } } },
  });

  return NextResponse.json({ page }, { status: 201 });
}
