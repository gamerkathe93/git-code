import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai";
import path from "path";
import { spawnSync } from "child_process";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { baseBranch, headBranch } = await req.json();

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const repo = await db.repository.findUnique({ where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } } });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
  const repoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);

  const diffResult = spawnSync("git", ["diff", baseBranch, headBranch, "--stat", "--unified=2"], {
    cwd: repoPath, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
  });
  const diff = (diffResult.stdout || "").slice(0, 4000);

  const result = await callClaude(
    `Based on this git diff, generate a PR title and description.\n\nDiff:\n\`\`\`\n${diff}\n\`\`\`\n\nRespond in this exact JSON format:\n{"title": "...", "body": "..."}`,
    "You generate clear, professional pull request titles and descriptions. Return only valid JSON."
  );

  try {
    const parsed = JSON.parse(result.trim());
    return NextResponse.json({ title: parsed.title || "", body: parsed.body || "" });
  } catch {
    return NextResponse.json({ title: "", body: result });
  }
}
