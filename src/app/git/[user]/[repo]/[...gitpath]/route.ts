import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPO_BASE = process.env.REPO_STORAGE_PATH ?? path.join(process.env.HOME ?? "~", ".gitcode", "repos");

type Params = { params: Promise<{ user: string; repo: string; gitpath: string[] }> };

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

function findHeaderEnd(buf: Buffer): number {
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a && buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) return i + 4;
  }
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0a && buf[i + 1] === 0x0a) return i + 2;
  }
  return -1;
}

function isEpipe(e: unknown): boolean {
  return (e as NodeJS.ErrnoException)?.code === "EPIPE";
}

function runGitBackend(
  req: NextRequest,
  gitpath: string[],
  remoteUser: string | null
): Promise<Response> {
  const service = req.nextUrl.searchParams.get("service") ?? "";
  const pathStr = gitpath.join("/");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_PROJECT_ROOT: REPO_BASE,
    GIT_HTTP_EXPORT_ALL: "1",
    GIT_HTTP_MAX_REQUEST_BUFFER: "500m",
    PATH_INFO: `/${pathStr}`,
    REQUEST_METHOD: req.method,
    CONTENT_TYPE: req.headers.get("content-type") ?? "",
    CONTENT_LENGTH: req.headers.get("content-length") ?? "0",
    QUERY_STRING: service ? `service=${service}` : (req.nextUrl.search.slice(1) || ""),
    REMOTE_ADDR: "127.0.0.1",
    ...(remoteUser ? { REMOTE_USER: remoteUser } : {}),
  };

  return new Promise((resolve) => {
    const proc = spawn("git", ["http-backend"], { env });

    // Suppress EPIPE on stdin/stdout — git closes its end when done, which is normal
    proc.stdin.on("error", (e: NodeJS.ErrnoException) => {
      if (!isEpipe(e)) console.error("git stdin error:", e.message);
    });
    proc.stdout.on("error", (e: NodeJS.ErrnoException) => {
      if (!isEpipe(e)) console.error("git stdout error:", e.message);
    });

    // Stream request body to git stdin without buffering the whole thing
    if (req.body && req.method === "POST") {
      const reader = req.body.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Respect backpressure: wait for drain if write returns false
            const ok = proc.stdin.write(Buffer.from(value));
            if (!ok) {
              await new Promise<void>((res) => proc.stdin.once("drain", res));
            }
          }
        } catch (e) {
          if (!isEpipe(e)) console.error("stdin pump error:", e);
        } finally {
          try { proc.stdin.end(); } catch { /* already closed */ }
        }
      })();
    } else {
      proc.stdin.end();
    }

    // Buffer stdout until headers are complete, then stream body in real-time
    const headerChunks: Buffer[] = [];
    let headersParsed = false;
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
      cancel() {
        // Client disconnected — kill the git process
        try { proc.kill(); } catch { /* already gone */ }
      },
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      if (headersParsed) {
        try { streamController?.enqueue(new Uint8Array(chunk)); } catch { /* stream closed */ }
        return;
      }

      headerChunks.push(chunk);
      const combined = Buffer.concat(headerChunks);
      const headerEnd = findHeaderEnd(combined);

      if (headerEnd !== -1) {
        headersParsed = true;
        const headerStr = combined.slice(0, headerEnd).toString("utf-8");
        const remaining = combined.slice(headerEnd);

        let status = 200;
        const headers = new Headers();
        headers.set("cache-control", "no-cache");
        headers.set("x-content-type-options", "nosniff");

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

        if (remaining.length > 0) {
          try { streamController?.enqueue(new Uint8Array(remaining)); } catch { /* stream closed */ }
        }

        resolve(new Response(body, { status, headers }));
      }
    });

    proc.stdout.on("end", () => {
      try { streamController?.close(); } catch { /* already closed */ }
    });

    proc.stderr.on("data", (d: Buffer) => {
      console.error("git http-backend:", d.toString().trimEnd());
    });

    proc.on("error", (err) => {
      console.error("git spawn error:", err);
      if (!headersParsed) {
        resolve(new Response("git not available", { status: 500 }));
      } else {
        try { streamController?.error(err); } catch { /* already closed */ }
      }
    });

    proc.on("close", (code) => {
      if (!headersParsed) {
        resolve(new Response(`git exited with code ${code}`, { status: 500 }));
      }
      // Stream is closed by stdout 'end' event above
    });
  });
}

async function handle(req: NextRequest, { params }: Params) {
  const { user, repo: repoName, gitpath } = await params;

  const cleanRepo = repoName.replace(/\.git$/, "");

  const ownerUser = await db.user.findUnique({ where: { username: user } });
  if (!ownerUser) return new Response("Not found", { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: cleanRepo } },
  });
  if (!repo) return new Response("Not found", { status: 404 });

  const pathStr = gitpath.join("/");
  const isReadOperation =
    (pathStr.includes("info/refs") && req.nextUrl.searchParams.get("service") === "git-upload-pack") ||
    pathStr.endsWith("git-upload-pack");

  let authenticatedUser: string | null = null;

  if (repo.isPrivate || !isReadOperation) {
    const session = await authenticate(req);
    if (!session) return requireAuth();

    if (!isReadOperation && session.username !== user) {
      return new Response("Forbidden", { status: 403 });
    }
    authenticatedUser = session.username;
  }

  return runGitBackend(req, [user, `${cleanRepo}.git`, ...gitpath], authenticatedUser);
}

export const GET = handle;
export const POST = handle;
