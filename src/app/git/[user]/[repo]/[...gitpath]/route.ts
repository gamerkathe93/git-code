import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for large pushes

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

async function runGitBackend(
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

    // Stream request body → git stdin (avoids buffering 100MB+ pushes)
    if (req.body && req.method === "POST") {
      const reader = req.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            proc.stdin.write(Buffer.from(value));
          }
        } catch (e) {
          console.error("stdin pump error:", e);
        } finally {
          proc.stdin.end();
        }
      };
      pump();
    } else {
      proc.stdin.end();
    }

    // Buffer stdout to parse CGI headers, then stream the rest
    const headerChunks: Buffer[] = [];
    let headersParsed = false;
    let responseStatus = 200;
    const responseHeaders = new Headers();
    const bodyChunks: Buffer[] = [];

    proc.stdout.on("data", (chunk: Buffer) => {
      if (headersParsed) {
        bodyChunks.push(chunk);
        return;
      }

      headerChunks.push(chunk);
      const combined = Buffer.concat(headerChunks);
      const headerEnd = findHeaderEnd(combined);

      if (headerEnd !== -1) {
        headersParsed = true;
        const headerStr = combined.slice(0, headerEnd).toString("utf-8");
        const bodyStart = headerEnd + (combined.slice(headerEnd, headerEnd + 2).toString() === "\r\n" ? 2 : 0);
        const remaining = combined.slice(bodyStart);
        if (remaining.length > 0) bodyChunks.push(remaining);

        for (const line of headerStr.split(/\r?\n/)) {
          if (!line.trim()) continue;
          const colonIdx = line.indexOf(":");
          if (colonIdx === -1) continue;
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();
          if (key === "status") {
            responseStatus = parseInt(val.split(" ")[0], 10) || 200;
          } else {
            responseHeaders.set(key, val);
          }
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      console.error("git http-backend stderr:", chunk.toString());
    });

    proc.stdout.on("end", () => {
      const body = Buffer.concat(bodyChunks);
      resolve(new Response(body, { status: responseStatus, headers: responseHeaders }));
    });

    proc.on("error", (err) => {
      console.error("git http-backend spawn error:", err);
      resolve(new Response("git not available on this server", { status: 500 }));
    });

    proc.on("close", (code) => {
      if (code !== 0 && bodyChunks.length === 0) {
        resolve(new Response(`git exited with code ${code}`, { status: 500 }));
      }
    });
  });
}

// Find end of CGI headers (\r\n\r\n or \n\n)
function findHeaderEnd(buf: Buffer): number {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0a && buf[i + 1] === 0x0a) return i + 2;
    if (i + 3 < buf.length &&
      buf[i] === 0x0d && buf[i + 1] === 0x0a &&
      buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) return i + 4;
  }
  return -1;
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

  // Pass full path: /user/repo.git/info/refs etc.
  const fullGitPath = [user, `${cleanRepo}.git`, ...gitpath];
  return runGitBackend(req, fullGitPath, authenticatedUser);
}

export const GET = handle;
export const POST = handle;
