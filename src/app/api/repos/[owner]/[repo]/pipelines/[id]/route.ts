import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pipeline = await db.pipeline.findFirst({
    where: { id, repoId: repo.id },
    include: {
      jobs: { orderBy: { startedAt: "asc" } },
      trigger: { select: { username: true } },
    },
  });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(pipeline);
}
