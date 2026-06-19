import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; id: string }> };

async function getRepoAndOwner(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return null;
  return { repo, ownerUser };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getRepoAndOwner(owner, repoName);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { repo } = result;

  const existing = await db.label.findUnique({ where: { id } });
  if (!existing || existing.repoId !== repo.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, color, description } = await req.json();
  const label = await db.label.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
    },
  });
  return NextResponse.json({ label });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await getRepoAndOwner(owner, repoName);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { repo } = result;

  const existing = await db.label.findUnique({ where: { id } });
  if (!existing || existing.repoId !== repo.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.label.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
