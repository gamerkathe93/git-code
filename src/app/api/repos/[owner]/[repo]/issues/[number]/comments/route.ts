import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const issue = await db.issue.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });

  const comment = await db.comment.create({
    data: { body, authorId: session.userId, issueId: issue.id },
    include: { author: { select: { username: true, name: true, avatarUrl: true } } },
  });

  // Update issue updatedAt
  await db.issue.update({ where: { id: issue.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ comment }, { status: 201 });
}
