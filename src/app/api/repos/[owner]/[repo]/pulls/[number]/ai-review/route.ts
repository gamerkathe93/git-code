import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai";
import path from "path";
import { spawnSync } from "child_process";

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const prNumber = parseInt(number);

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: prNumber } },
  });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
  const repoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);

  const diffResult = spawnSync("git", [
    "diff", pr.baseBranch, pr.headBranch, "--unified=3", "--stat"
  ], { cwd: repoPath, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });

  const diff = (diffResult.stdout || "").slice(0, 6000); // cap at 6KB

  const review = await callClaude(
    `Review this pull request. PR title: "${pr.title}"\n\nDiff:\n\`\`\`\n${diff}\n\`\`\`\n\nProvide:\n1. **Summary** (2-3 sentences what this PR does)\n2. **Potential issues** (bugs, edge cases, security concerns — bullet list, or "None found")\n3. **Suggestions** (improvements, style, performance — bullet list, or "Looks good")\n\nBe direct and concise. Use markdown.`,
    "You are an expert code reviewer. Review pull requests clearly and constructively. Focus on correctness, security, and maintainability. Be specific about file/line references when possible."
  );

  return NextResponse.json({ review });
}
