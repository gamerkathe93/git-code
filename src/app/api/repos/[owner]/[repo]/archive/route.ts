import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { Readable } from "stream";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRepoPath } from "@/lib/git";
import { existsSync } from "fs";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref") || "HEAD";
  const format = searchParams.get("format") || "zip";

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

  // Validate ref and format
  const safeRef = /^[a-zA-Z0-9._\-/]+$/.test(ref) ? ref : "HEAD";
  const safeFormat = format === "tar" ? "tar" : "zip";
  const contentType = safeFormat === "tar" ? "application/x-tar" : "application/zip";
  const ext = safeFormat === "tar" ? "tar" : "zip";

  const proc = spawn("git", ["archive", `--format=${safeFormat}`, safeRef], {
    cwd: repoPath,
  });

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${repoName}-${safeRef}.${ext}"`,
    "Cache-Control": "no-store",
  });

  // Collect stderr for error handling
  let stderr = "";
  proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

  // Convert Node.js Readable to Web ReadableStream
  const webStream = Readable.toWeb(proc.stdout) as ReadableStream;

  return new Response(webStream, { headers });
}
