import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import path from "path";
import { spawnSync } from "child_process";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "code";

  if (!q) return NextResponse.json({ results: [] });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (type === "code") {
    const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
    const repoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);

    // Use git grep on HEAD
    const result = spawnSync("git", [
      "grep", "-n", "-i", "--max-count=5", q, "HEAD"
    ], { cwd: repoPath, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });

    const lines: { file: string; line: number; content: string }[] = [];
    if (result.stdout) {
      result.stdout.trim().split("\n").filter(Boolean).slice(0, 30).forEach(line => {
        // Format: HEAD:path/to/file.ts:42:content
        const parts = line.split(":");
        if (parts.length >= 4) {
          const file = parts[1];
          const lineNum = parseInt(parts[2]);
          const content = parts.slice(3).join(":").trim();
          lines.push({ file, line: lineNum, content });
        }
      });
    }

    return NextResponse.json({ results: lines, type: "code" });
  }

  if (type === "commits") {
    const GIT_REPO_PATH = process.env.GIT_REPO_PATH || path.join(process.cwd(), "repos");
    const repoPath = path.join(GIT_REPO_PATH, owner, `${repoName}.git`);

    const result = spawnSync("git", [
      "log", "--oneline", `--grep=${q}`, "-20"
    ], { cwd: repoPath, encoding: "utf8" });

    const commits = (result.stdout || "").trim().split("\n").filter(Boolean).map(line => {
      const sha = line.slice(0, 7);
      const message = line.slice(8);
      return { sha, message };
    });

    return NextResponse.json({ results: commits, type: "commits" });
  }

  if (type === "issues") {
    const issues = await db.issue.findMany({
      where: {
        repoId: repo.id,
        OR: [
          { title: { contains: q } },
          { body: { contains: q } },
        ],
      },
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ results: issues.map(i => ({ id: i.id, number: i.number, title: i.title, state: i.state, author: i.author.username })), type: "issues" });
  }

  return NextResponse.json({ results: [], type });
}
