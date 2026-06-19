import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCommits } from "@/lib/git";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const branch = searchParams.get("branch") || "HEAD";
  const limit = parseInt(searchParams.get("limit") || "30");

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (repo.isPrivate && session.username !== owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const commits = await getCommits(owner, repoName, branch, limit);
  return NextResponse.json({ commits });
}
