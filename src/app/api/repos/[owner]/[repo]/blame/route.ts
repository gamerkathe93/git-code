import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";

type Params = { params: Promise<{ owner: string; repo: string }> };

export interface BlameLine {
  sha: string;
  author: string;
  timestamp: number;
  lineNum: number;
  content: string;
}

function runGitBlame(repoPath: string, ref: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", ["blame", "--porcelain", ref, "--", filePath], {
      cwd: repoPath,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `git blame exited with code ${code}`));
      else resolve(stdout);
    });
  });
}

function parsePorcelain(raw: string): BlameLine[] {
  const lines = raw.split("\n");
  const result: BlameLine[] = [];

  let currentSha = "";
  let currentAuthor = "";
  let currentTimestamp = 0;
  let currentLineNum = 0;

  for (const line of lines) {
    // 40-char hex SHA header line: "<sha> <orig_line> <final_line> <count>"
    if (/^[0-9a-f]{40}\s/.test(line)) {
      const parts = line.split(" ");
      currentSha = parts[0];
      currentLineNum = parseInt(parts[2], 10);
    } else if (line.startsWith("author ")) {
      currentAuthor = line.slice(7);
    } else if (line.startsWith("author-time ")) {
      currentTimestamp = parseInt(line.slice(12), 10);
    } else if (line.startsWith("\t")) {
      // Tab-prefixed line = actual file content
      result.push({
        sha: currentSha,
        author: currentAuthor,
        timestamp: currentTimestamp,
        lineNum: currentLineNum,
        content: line.slice(1), // strip the leading tab
      });
    }
  }

  return result;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  const ref = searchParams.get("ref") || "HEAD";

  if (!filePath) return NextResponse.json({ error: "Missing ?path=" }, { status: 400 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repository = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repository) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (repository.isPrivate && session.username !== owner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repoPath = getRepoPath(owner, repoName);
  if (!existsSync(repoPath)) return NextResponse.json({ error: "Repo not found on disk" }, { status: 404 });

  // Sanitize inputs
  const safeRef = /^[a-zA-Z0-9._\-/]+$/.test(ref) ? ref : "HEAD";
  const safePath = filePath.replace(/\.\.\//g, "").replace(/^\/+/, "");

  try {
    const raw = await runGitBlame(repoPath, safeRef, safePath);
    const blameLines = parsePorcelain(raw);
    return NextResponse.json({ lines: blameLines });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "git blame failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
