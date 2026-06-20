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

  // Get commit activity (last 52 weeks)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const logResult = spawnSync("git", [
    "log", "--format=%ad", "--date=short", "--since=1 year ago"
  ], { cwd: repoPath, encoding: "utf8" });

  const commitsByDate: Record<string, number> = {};
  if (logResult.stdout) {
    logResult.stdout.trim().split("\n").filter(Boolean).forEach(date => {
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });
  }

  // Get contributors (author, commit count)
  const contribResult = spawnSync("git", [
    "log", "--format=%ae %an", "--since=1 year ago"
  ], { cwd: repoPath, encoding: "utf8" });

  const authorMap: Record<string, { name: string; count: number }> = {};
  if (contribResult.stdout) {
    contribResult.stdout.trim().split("\n").filter(Boolean).forEach(line => {
      const spaceIdx = line.indexOf(" ");
      const email = line.slice(0, spaceIdx);
      const name = line.slice(spaceIdx + 1);
      if (!authorMap[email]) authorMap[email] = { name, count: 0 };
      authorMap[email].count++;
    });
  }

  const contributors = Object.entries(authorMap)
    .map(([email, { name, count }]) => ({ email, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Get language breakdown from file extensions
  const filesResult = spawnSync("git", [
    "ls-tree", "-r", "--name-only", "HEAD"
  ], { cwd: repoPath, encoding: "utf8" });

  const langMap: Record<string, number> = {};
  const EXT_LANG: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
    py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java",
    cs: "C#", cpp: "C++", c: "C", swift: "Swift", kt: "Kotlin",
    php: "PHP", html: "HTML", css: "CSS", scss: "SCSS", md: "Markdown",
    json: "JSON", yaml: "YAML", yml: "YAML", sh: "Shell", sql: "SQL",
  };

  if (filesResult.stdout) {
    filesResult.stdout.trim().split("\n").filter(Boolean).forEach(f => {
      const ext = f.split(".").pop()?.toLowerCase() || "";
      const lang = EXT_LANG[ext];
      if (lang) langMap[lang] = (langMap[lang] || 0) + 1;
    });
  }

  const totalFiles = Object.values(langMap).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(langMap)
    .map(([name, count]) => ({ name, count, pct: Math.round(count / totalFiles * 100) }))
    .sort((a, b) => b.count - a.count);

  // DB stats
  const [issueCount, prCount, pipelineCount] = await Promise.all([
    db.issue.count({ where: { repoId: repo.id } }),
    db.pullRequest.count({ where: { repoId: repo.id } }),
    db.pipeline.count({ where: { repoId: repo.id } }),
  ]);

  return NextResponse.json({
    commitsByDate,
    contributors,
    languages,
    stats: { issues: issueCount, prs: prCount, pipelines: pipelineCount, stars: repo.starsCount, forks: repo.forksCount },
  });
}
