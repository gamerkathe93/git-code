import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { Readable } from "stream";
import path from "path";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPO_BASE =
  process.env.REPO_STORAGE_PATH ?? path.join(process.env.HOME ?? "~", ".gitcode", "repos");

type Params = { params: Promise<{ user: string; repo: string; gitpath: string[] }> };

async function authenticate(
  req: NextRequest
): Promise<{ userId: string; username: string } | null> {
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
    if (
      buf[i] === 0x0d &&
      buf[i + 1] === 0x0a &&
      buf[i + 2] === 0x0d &&
      buf[i + 3] === 0x0a
    )
      return i + 4;
  }
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0a && buf[i + 1] === 0x0a) return i + 2;
  }
  return -1;
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
    QUERY_STRING: service
      ? `service=${service}`
      : req.nextUrl.search.slice(1) || "",
    REMOTE_ADDR: "127.0.0.1",
    ...(remoteUser ? { REMOTE_USER: remoteUser } : {}),
  };

  return new Promise((resolve) => {
    const proc = spawn("git", ["http-backend"], { env });

    // Suppress EPIPE — normal when client closes connection after receiving response
    const suppress = (e: NodeJS.ErrnoException) => {
      if (e.code !== "EPIPE") console.error("git stream error:", e.message);
    };
    proc.stdin.on("error", suppress);
    proc.stdout.on("error", suppress);
    proc.stderr.on("data", (d: Buffer) =>
      console.error("git http-backend:", d.toString().trimEnd())
    );

    // Pipe request body → git stdin using Node.js native pipe (handles backpressure correctly)
    if (req.body && req.method === "POST") {
      try {
        const src = Readable.fromWeb(
          req.body as Parameters<typeof Readable.fromWeb>[0]
        );
        src.pipe(proc.stdin);
        src.on("error", (e: NodeJS.ErrnoException) => {
          if (e.code !== "EPIPE") console.error("body pipe error:", e.message);
          try { proc.stdin.destroy(); } catch { /* ok */ }
        });
      } catch (e) {
        // Fallback for environments where fromWeb isn't available
        console.error("Readable.fromWeb unavailable, falling back:", e);
        (async () => {
          const reader = req.body!.getReader();
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              const ok = proc.stdin.write(Buffer.from(value));
              if (!ok) await new Promise<void>((r) => proc.stdin.once("drain", r));
            }
          } catch (e2) {
            if ((e2 as NodeJS.ErrnoException).code !== "EPIPE")
              console.error("pump error:", e2);
          } finally {
            try { proc.stdin.end(); } catch { /* ok */ }
          }
        })();
      }
    } else {
      proc.stdin.end();
    }

    // Buffer CGI headers, then stream body in real-time
    const headerBufs: Buffer[] = [];
    let headersDone = false;
    let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;

    const responseStream = new ReadableStream<Uint8Array>({
      start(c) { ctrl = c; },
      cancel() {
        // Client disconnected — kill git to avoid zombie processes
        try { proc.kill("SIGTERM"); } catch { /* ok */ }
      },
    });

    const tryResolve = (combined: Buffer) => {
      const end = findHeaderEnd(combined);
      if (end === -1) return;

      headersDone = true;
      const hdrStr = combined.slice(0, end).toString("utf-8");
      const bodyBytes = combined.slice(end);

      let status = 200;
      const headers = new Headers({ "cache-control": "no-cache" });

      for (const line of hdrStr.split(/\r?\n/)) {
        const colon = line.indexOf(":");
        if (colon === -1) continue;
        const k = line.slice(0, colon).trim().toLowerCase();
        const v = line.slice(colon + 1).trim();
        if (!k) continue;
        if (k === "status") status = parseInt(v.split(" ")[0], 10) || 200;
        else headers.set(k, v);
      }

      if (bodyBytes.length) {
        try { ctrl?.enqueue(new Uint8Array(bodyBytes)); } catch { /* ok */ }
      }

      resolve(new Response(responseStream, { status, headers }));
    };

    proc.stdout.on("data", (chunk: Buffer) => {
      if (headersDone) {
        try { ctrl?.enqueue(new Uint8Array(chunk)); } catch { /* ok */ }
      } else {
        headerBufs.push(chunk);
        tryResolve(Buffer.concat(headerBufs));
      }
    });

    proc.stdout.on("end", () => {
      try { ctrl?.close(); } catch { /* ok */ }
    });

    proc.on("error", (err) => {
      console.error("git spawn error:", err);
      if (!headersDone) resolve(new Response("git unavailable", { status: 500 }));
    });

    proc.on("close", (code) => {
      if (!headersDone) {
        console.error(`git exited with code ${code} before sending headers`);
        resolve(new Response(`git error (${code})`, { status: 500 }));
      }
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
    (pathStr.includes("info/refs") &&
      req.nextUrl.searchParams.get("service") === "git-upload-pack") ||
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

  return runGitBackend(
    req,
    [user, `${cleanRepo}.git`, ...gitpath],
    authenticatedUser
  );
}

export const GET = handle;
export const POST = handle;
