import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; id: string }> };

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

  const { owner, repo: repoName, id } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = await db.milestone.findUnique({
    where: { id },
    include: {
      _count: { select: { issues: true } },
      issues: { select: { state: true } },
    },
  });
  if (!milestone || milestone.repoId !== repo.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = milestone._count.issues;
  const closed = milestone.issues.filter((i) => i.state === "closed").length;
  const { issues, _count, ...rest } = milestone;
  return NextResponse.json({ milestone: { ...rest, totalIssues: total, closedIssues: closed } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.milestone.findUnique({ where: { id } });
  if (!existing || existing.repoId !== repo.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, description, dueDate, state } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (state !== undefined) {
    updateData.state = state;
    if (state === "closed") {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }
  }

  const milestone = await db.milestone.update({ where: { id }, data: updateData });
  return NextResponse.json({ milestone });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.milestone.findUnique({ where: { id } });
  if (!existing || existing.repoId !== repo.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.milestone.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
