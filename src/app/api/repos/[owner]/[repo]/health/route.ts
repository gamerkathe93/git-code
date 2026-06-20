import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import path from "path";
import { spawnSync } from "child_process";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
  const repoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);

  const checks: { label: string; score: number; max: number; passed: boolean }[] = [];

  // 1. Has README (+20)
  const lsTree = spawnSync("git", ["ls-tree", "--name-only", "HEAD"], { cwd: repoPath, encoding: "utf8" });
  const files = (lsTree.stdout || "").toLowerCase().split("\n");
  const hasReadme = files.some(f => f.includes("readme"));
  checks.push({ label: "README file", score: hasReadme ? 20 : 0, max: 20, passed: hasReadme });

  // 2. Has description (+10)
  const hasDesc = repo.description.trim().length > 10;
  checks.push({ label: "Repository description", score: hasDesc ? 10 : 0, max: 10, passed: hasDesc });

  // 3. Recent commits (last 30 days) (+20)
  const recentLog = spawnSync("git", ["log", "--since=30 days ago", "--oneline"], { cwd: repoPath, encoding: "utf8" });
  const recentCommits = (recentLog.stdout || "").trim().split("\n").filter(Boolean).length;
  const recentScore = recentCommits >= 5 ? 20 : Math.round(recentCommits / 5 * 20);
  checks.push({ label: "Recent activity (30 days)", score: recentScore, max: 20, passed: recentCommits > 0 });

  // 4. Has CI pipelines (+15)
  const pipelineCount = await db.pipeline.count({ where: { repoId: repo.id } });
  checks.push({ label: "CI/CD pipelines", score: pipelineCount > 0 ? 15 : 0, max: 15, passed: pipelineCount > 0 });

  // 5. Issue response rate (+15)
  const [totalIssues, closedIssues] = await Promise.all([
    db.issue.count({ where: { repoId: repo.id } }),
    db.issue.count({ where: { repoId: repo.id, state: "closed" } }),
  ]);
  const responseRate = totalIssues > 0 ? closedIssues / totalIssues : 1;
  const responseScore = Math.round(responseRate * 15);
  checks.push({ label: "Issue response rate", score: responseScore, max: 15, passed: responseRate >= 0.5 });

  // 6. Has .gitignore or license (+10)
  const hasConfig = files.some(f => f.includes(".gitignore") || f.includes("license") || f.includes(".env.example"));
  checks.push({ label: "Config files (.gitignore, license)", score: hasConfig ? 10 : 0, max: 10, passed: hasConfig });

  // 7. Stars bonus (+10)
  const starScore = Math.min(repo.starsCount * 2, 10);
  checks.push({ label: "Community stars", score: starScore, max: 10, passed: repo.starsCount > 0 });

  const total = checks.reduce((sum, c) => sum + c.score, 0);

  return NextResponse.json({ score: total, checks, maxScore: 100 });
}
