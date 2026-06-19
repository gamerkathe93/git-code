import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";

type Params = { params: Promise<{ owner: string; repo: string }> };

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `git exited with code ${code}`));
      else resolve(stdout.trim());
    });
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const base = searchParams.get("base");
  const head = searchParams.get("head");

  if (!base || !head)
    return NextResponse.json({ error: "Missing ?base= and ?head=" }, { status: 400 });

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

  // Validate refs
  const refPattern = /^[a-zA-Z0-9._\-/]+$/;
  if (!refPattern.test(base) || !refPattern.test(head))
    return NextResponse.json({ error: "Invalid ref names" }, { status: 400 });

  try {
    const [logRaw, statRaw] = await Promise.all([
      runGit(
        ["log", `${base}..${head}`, "--format=%H|%an|%ae|%ai|%s", "--no-merges"],
        repoPath
      ),
      runGit(["diff", "--stat", `${base}..${head}`], repoPath),
    ]);

    const commits = logRaw
      ? logRaw.split("\n").filter(Boolean).map((line) => {
          const [sha, author, email, date, ...msgParts] = line.split("|");
          return {
            sha: sha ?? "",
            shortSha: (sha ?? "").slice(0, 7),
            author: author ?? "",
            email: email ?? "",
            date: date ?? "",
            message: msgParts.join("|"),
          };
        })
      : [];

    return NextResponse.json({ commits, stat: statRaw, base, head });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "git compare failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
