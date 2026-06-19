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

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") ?? "open";

  const whereState =
    state === "all" ? {} : { state: state === "closed" ? "closed" : "open" };

  const milestones = await db.milestone.findMany({
    where: { repoId: repo.id, ...whereState },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { issues: true } },
      issues: { select: { state: true } },
    },
  });

  const result = milestones.map((m) => {
    const total = m._count.issues;
    const closed = m.issues.filter((i) => i.state === "closed").length;
    const { issues, _count, ...rest } = m;
    return { ...rest, totalIssues: total, closedIssues: closed };
  });

  return NextResponse.json({ milestones: result });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, description = "", dueDate } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const milestone = await db.milestone.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      repoId: repo.id,
    },
  });
  return NextResponse.json({ milestone }, { status: 201 });
}
