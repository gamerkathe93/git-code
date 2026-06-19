import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";

type Params = { params: Promise<{ owner: string; repo: string; name: string }> };

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

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, name: tagName } = await params;

  // Owner only
  if (session.username !== owner)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repository = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repository) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!/^[a-zA-Z0-9._\-/]+$/.test(tagName))
    return NextResponse.json({ error: "Invalid tag name" }, { status: 400 });

  const repoPath = getRepoPath(owner, repoName);
  if (!existsSync(repoPath)) return NextResponse.json({ error: "Repo not found on disk" }, { status: 404 });

  try {
    await runGit(["tag", "-d", tagName], repoPath);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete tag";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
