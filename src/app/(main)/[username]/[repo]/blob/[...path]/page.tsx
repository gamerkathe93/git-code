import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { FileCode, ChevronRight, Eye, Code2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileContent, getRepoPath } from "@/lib/git";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import CopyButton from "@/components/repo/CopyButton";

type Params = { params: Promise<{ username: string; repo: string; path: string[] }>; searchParams: Promise<{ view?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { path } = await params;
  return { title: path[path.length - 1] };
}

// Language → syntax highlight class (basic)
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", go: "go", rs: "rust", java: "java", rb: "ruby",
    sh: "bash", bash: "bash", zsh: "bash", yml: "yaml", yaml: "yaml",
    json: "json", md: "markdown", css: "css", html: "html", sql: "sql",
    toml: "toml", env: "bash", dockerfile: "dockerfile",
  };
  return map[ext] ?? "plaintext";
}

interface BlameLine {
  sha: string;
  author: string;
  timestamp: number;
  lineNum: number;
  content: string;
}

function runGitBlameSync(repoPath: string, ref: string, filePath: string): BlameLine[] {
  const result = spawnSync("git", ["blame", "--porcelain", ref, "--", filePath], {
    cwd: repoPath,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) return [];
  const raw = result.stdout ?? "";
  const lines = raw.split("\n");
  const blame: BlameLine[] = [];
  let currentSha = "";
  let currentAuthor = "";
  let currentTimestamp = 0;
  let currentLineNum = 0;

  for (const line of lines) {
    if (/^[0-9a-f]{40}\s/.test(line)) {
      const parts = line.split(" ");
      currentSha = parts[0];
      currentLineNum = parseInt(parts[2], 10);
    } else if (line.startsWith("author ")) {
      currentAuthor = line.slice(7);
    } else if (line.startsWith("author-time ")) {
      currentTimestamp = parseInt(line.slice(12), 10);
    } else if (line.startsWith("\t")) {
      blame.push({
        sha: currentSha,
        author: currentAuthor,
        timestamp: currentTimestamp,
        lineNum: currentLineNum,
        content: line.slice(1),
      });
    }
  }
  return blame;
}

// Stable color per sha prefix
function shaColor(sha: string): string {
  const colors = [
    "#388bfd22", "#3fb95022", "#d2992222", "#f8514922",
    "#58a6ff22", "#bc8cff22", "#79c0ff22", "#56d36422",
  ];
  const idx = parseInt(sha.slice(0, 4), 16) % colors.length;
  return colors[idx];
}

function shaTextColor(sha: string): string {
  const colors = [
    "#388bfd", "#3fb950", "#d29922", "#f85149",
    "#58a6ff", "#bc8cff", "#79c0ff", "#56d364",
  ];
  const idx = parseInt(sha.slice(0, 4), 16) % colors.length;
  return colors[idx];
}

export default async function BlobPage({ params, searchParams }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, path } = await params;
  const { view } = await searchParams;
  const isBlame = view === "blame";

  const branch = path[0];
  const filePath = path.slice(1).join("/");
  const fileName = path[path.length - 1];

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  let content: string | null = null;
  let error = "";
  content = await getFileContent(username, repoName, filePath, branch);
  if (content === null) error = `Could not read "${filePath}" on branch "${branch}"`;

  const lines = (content ?? "").split("\n");
  const lang = detectLanguage(fileName);
  const pathParts = filePath.split("/");

  const currentUrl = `/${username}/${repoName}/blob/${path.join("/")}`;
  const blameUrl = `${currentUrl}?view=blame`;
  const codeUrl = currentUrl;

  // Blame data (only loaded when in blame mode)
  let blameLines: BlameLine[] = [];
  if (isBlame && content !== null) {
    const repoPath = getRepoPath(username, repoName);
    if (existsSync(repoPath)) {
      const safeRef = /^[a-zA-Z0-9._\-/]+$/.test(branch) ? branch : "HEAD";
      const safePath = filePath.replace(/\.\.\//g, "").replace(/^\/+/, "");
      blameLines = runGitBlameSync(repoPath, safeRef, safePath);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href={`/${username}/${repoName}`} style={{ fontWeight: 600, fontSize: 15, color: "var(--accent-hover)" }}>
          {repoName}
        </Link>
        {pathParts.map((part, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronRight size={14} color="var(--text-subtle)" />
            {i < pathParts.length - 1 ? (
              <Link
                href={`/${username}/${repoName}/tree/${branch}/${pathParts.slice(0, i + 1).join("/")}`}
                style={{ color: "var(--accent-hover)", fontSize: 15 }}
              >{part}</Link>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 600 }}>{part}</span>
            )}
          </span>
        ))}
      </div>

      {error ? (
        <div className="card" style={{ padding: 24, color: "var(--danger-text)", textAlign: "center" }}>
          <p>Could not load file: {error}</p>
          <Link href={`/${username}/${repoName}`} className="btn btn-sm" style={{ marginTop: 12 }}>← Back to repo</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {/* File header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileCode size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fileName}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {lines.length} line{lines.length !== 1 ? "s" : ""} · {lang}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <CopyButton text={content ?? ""} />
              {isBlame ? (
                <Link
                  href={codeUrl}
                  className="btn btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  <Code2 size={12} /> Code
                </Link>
              ) : (
                <Link
                  href={blameUrl}
                  className="btn btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  <Eye size={12} /> Blame
                </Link>
              )}
            </div>
          </div>

          {isBlame && blameLines.length > 0 ? (
            /* Blame view */
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%", borderCollapse: "collapse",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 12, lineHeight: 1.6,
              }}>
                <tbody>
                  {blameLines.map((bl, i) => {
                    const shortSha = bl.sha.slice(0, 7);
                    const prevSha = i > 0 ? blameLines[i - 1].sha : "";
                    const isNewGroup = bl.sha !== prevSha;
                    const bg = shaColor(bl.sha);
                    const textC = shaTextColor(bl.sha);
                    const date = bl.timestamp ? new Date(bl.timestamp * 1000).toLocaleDateString() : "";
                    return (
                      <tr key={i} data-sha={bl.sha} style={{ verticalAlign: "top" }}>
                        {/* Blame chip column */}
                        <td style={{
                          width: 200, minWidth: 200, padding: "0 8px",
                          background: isNewGroup ? bg : "transparent",
                          borderRight: "1px solid var(--border-muted)",
                          borderBottom: "1px solid var(--border-muted)",
                          fontSize: 10,
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}>
                          {isNewGroup ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "2px 0" }}>
                              <code style={{ color: textC, fontWeight: 700 }}>{shortSha}</code>
                              <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                                {bl.author}
                              </span>
                              {date && <span style={{ color: "var(--text-subtle)", fontSize: 9 }}>{date}</span>}
                            </div>
                          ) : null}
                        </td>
                        {/* Line number */}
                        <td style={{
                          width: 1, padding: "0 16px 0 12px", textAlign: "right",
                          color: "var(--text-subtle)", userSelect: "none",
                          borderRight: "1px solid var(--border-muted)",
                          background: "rgba(0,0,0,0.15)",
                          fontSize: 11,
                        }}>
                          {bl.lineNum}
                        </td>
                        {/* Code content */}
                        <td style={{ padding: "0 16px", whiteSpace: "pre", color: "var(--text)" }}>
                          {bl.content || " "}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Normal code view */
            <div style={{ overflowX: "auto", position: "relative" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: 12, lineHeight: 1.6 }}>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td style={{
                        width: 1, padding: "0 16px 0 12px", textAlign: "right",
                        color: "var(--text-subtle)", userSelect: "none",
                        borderRight: "1px solid var(--border-muted)",
                        background: "rgba(0,0,0,0.15)",
                        fontSize: 11,
                      }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: "0 16px", whiteSpace: "pre", color: "var(--text)" }}>
                        {line || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
