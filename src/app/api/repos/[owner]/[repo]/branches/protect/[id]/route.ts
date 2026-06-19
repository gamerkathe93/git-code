import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  const protection = await (db as any).branchProtection.findUnique({ where: { id } });
  if (!protection || protection.repoId !== repo.id) {
    return NextResponse.json({ error: "Protection rule not found" }, { status: 404 });
  }

  await (db as any).branchProtection.delete({ where: { id } });

  return NextResponse.json({ message: "Protection rule deleted" });
}
