import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline-runner";

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
  const status = searchParams.get("status");
  const branch = searchParams.get("branch");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "25");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { repoId: repo.id };
  if (status) where.status = status;
  if (branch) where.branch = branch;

  const [pipelines, total] = await Promise.all([
    db.pipeline.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        jobs: { select: { id: true, name: true, stage: true, status: true, duration: true } },
        trigger: { select: { username: true, avatarUrl: true } },
      },
    }),
    db.pipeline.count({ where }),
  ]);

  return NextResponse.json({
    pipelines,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { branch = repo.defaultBranch, commitSha = "", commitMsg = "", source = "manual" } = body;

  const pipeline = await db.pipeline.create({
    data: {
      repoId: repo.id,
      branch,
      commitSha,
      commitMsg,
      source,
      triggerId: session.userId,
      status: "pending",
    },
  });

  // Run pipeline asynchronously
  setImmediate(() => {
    runPipeline(pipeline.id, owner, repoName).catch(console.error);
  });

  return NextResponse.json({ pipeline }, { status: 201 });
}
