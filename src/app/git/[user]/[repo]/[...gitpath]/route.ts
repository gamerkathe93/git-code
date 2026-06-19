import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

const REPO_BASE = process.env.REPO_STORAGE_PATH ?? path.join(process.env.HOME ?? "~", ".gitcode", "repos");

type Params = { params: Promise<{ user: string; repo: string; gitpath: string[] }> };

// Authenticate via HTTP Basic auth (used by git clients)
async function authenticate(req: NextRequest): Promise<{ userId: string; username: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return null;

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) return null;

  const username = decoded.slice(0, colonIdx);
  const password = decoded.slice(colonIdx + 1);

  const user = await db.user.findUnique({ where: { username } });
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  return { userId: user.id, username: user.username };
}

function requireAuth(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="GitCode"' },
  });
}

async function runGitBackend(req: NextRequest, repoPath: string, gitpath: string[]): Promise<Response> {
  const service = req.nextUrl.searchParams.get("service") ?? "";
  const pathStr = gitpath.join("/");

  // Build CGI environment for git-http-backend
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][]
    ),
    GIT_PROJECT_ROOT: REPO_BASE,
    GIT_HTTP_EXPORT_ALL: "1",
    PATH_INFO: `/${pathStr}`,
    REQUEST_METHOD: req.method,
    CONTENT_TYPE: req.headers.get("content-type") ?? "",
    QUERY_STRING: service ? `service=${service}` : req.nextUrl.search.slice(1),
    GIT_REPOSITORY: repoPath,
    REMOTE_ADDR: "127.0.0.1",
  };

  const body = req.method === "POST" ? await req.arrayBuffer() : null;

  return new Promise((resolve) => {
    const proc = spawn("git", ["http-backend"], { env });

    // Write request body to stdin
    if (body && body.byteLength > 0) {
      const buf = Buffer.from(body);
      env.CONTENT_LENGTH = String(buf.byteLength);
      proc.stdin.write(buf);
    }
    proc.stdin.end();

    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

    proc.stdout.on("end", () => {
      const output = Buffer.concat(chunks);

      // Parse CGI response: headers then blank line then body
      const headerEnd = output.indexOf("\r\n\r\n");
      const headerEndAlt = output.indexOf("\n\n");
      const splitAt = headerEnd !== -1 ? headerEnd : headerEndAlt;

      if (splitAt === -1) {
        resolve(new Response("Bad gateway", { status: 502 }));
        return;
      }

      const headerStr = output.slice(0, splitAt).toString("utf-8");
      const bodyStart = splitAt + (headerEnd !== -1 ? 4 : 2);
      const responseBody = output.slice(bodyStart);

      const headers = new Headers();
      let status = 200;

      for (const line of headerStr.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const val = line.slice(colonIdx + 1).trim();
        if (key === "status") {
          status = parseInt(val.split(" ")[0], 10) || 200;
        } else {
          headers.set(key, val);
        }
      }

      resolve(new Response(responseBody, { status, headers }));
    });

    proc.on("error", (err) => {
      console.error("git http-backend error:", err);
      resolve(new Response("git http-backend not available", { status: 500 }));
    });
  });
}

async function handle(req: NextRequest, { params }: Params) {
  const { user, repo: repoName, gitpath } = await params;

  // Strip .git suffix if present
  const cleanRepo = repoName.replace(/\.git$/, "");
  const repoPath = path.join(REPO_BASE, user, `${cleanRepo}.git`);

  // Look up repo in DB
  const ownerUser = await db.user.findUnique({ where: { username: user } });
  if (!ownerUser) return new Response("Not found", { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: cleanRepo } },
  });
  if (!repo) return new Response("Not found", { status: 404 });

  // Public repos allow anonymous read (git-upload-pack = clone/fetch)
  const isReadOperation =
    gitpath.join("/").includes("info/refs") &&
    req.nextUrl.searchParams.get("service") === "git-upload-pack" ||
    gitpath.join("/").endsWith("git-upload-pack");

  if (repo.isPrivate || !isReadOperation) {
    const session = await authenticate(req);
    if (!session) return requireAuth();

    // Write operations: must be the repo owner
    if (!isReadOperation && session.username !== user) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return runGitBackend(req, repoPath, [user, `${cleanRepo}.git`, ...gitpath]);
}

export const GET = handle;
export const POST = handle;

// Disable body parsing — git sends raw binary
export const dynamic = "force-dynamic";
