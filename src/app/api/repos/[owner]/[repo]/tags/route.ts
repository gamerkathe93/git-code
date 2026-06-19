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

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repository = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repository) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (repository.isPrivate && session.username !== owner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repoPath = getRepoPath(owner, repoName);
  if (!existsSync(repoPath)) return NextResponse.json({ tags: [] });

  try {
    const tagListRaw = await runGit(["tag", "--sort=-version:refname"], repoPath);
    if (!tagListRaw) return NextResponse.json({ tags: [] });

    const tagNames = tagListRaw.split("\n").filter(Boolean);

    const tags = await Promise.all(
      tagNames.map(async (name) => {
        try {
          const info = await runGit(
            ["log", "-1", "--format=%H|%an|%ai|%s", name],
            repoPath
          );
          const [sha, author, date, ...msgParts] = info.split("|");
          return { name, sha: sha?.slice(0, 40) ?? "", author: author ?? "", date: date ?? "", message: msgParts.join("|") ?? "" };
        } catch {
          return { name, sha: "", author: "", date: "", message: "" };
        }
      })
    );

    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;

  // Owner only
  if (session.username !== owner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repository = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repository) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repoPath = getRepoPath(owner, repoName);
  if (!existsSync(repoPath)) return NextResponse.json({ error: "Repo not found on disk" }, { status: 404 });

  const body = await req.json();
  const { name, ref, message } = body as { name?: string; ref?: string; message?: string };

  if (!name || !/^[a-zA-Z0-9._\-/]+$/.test(name))
    return NextResponse.json({ error: "Invalid tag name" }, { status: 400 });

  const safeRef = ref && /^[a-zA-Z0-9._\-/]+$/.test(ref) ? ref : "HEAD";

  try {
    if (message) {
      await runGit(["tag", "-a", name, safeRef, "-m", message], repoPath);
    } else {
      await runGit(["tag", name, safeRef], repoPath);
    }
    return NextResponse.json({ ok: true, name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create tag";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
