import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getFileContent } from "@/lib/git";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const ref = searchParams.get("ref") || "HEAD";

  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (repo.isPrivate && session.username !== owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = await getFileContent(owner, repoName, path, ref);
  if (content === null) return NextResponse.json({ error: "File not found" }, { status: 404 });

  return NextResponse.json({ content, path, ref });
}
