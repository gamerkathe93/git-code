import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { FileCode, ChevronRight, Copy, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileContent } from "@/lib/git";
import CopyButton from "@/components/repo/CopyButton";

type Params = { params: Promise<{ username: string; repo: string; path: string[] }> };

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

export default async function BlobPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, path } = await params;
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

  // getFileContent(username, repoName, filePath, ref) — filePath first, ref second
  let content: string | null = null;
  let error = "";
  content = await getFileContent(username, repoName, filePath, branch);
  if (content === null) error = `Could not read "${filePath}" on branch "${branch}"`;

  const lines = (content ?? "").split("\n");
  const lang = detectLanguage(fileName);
  const pathParts = filePath.split("/");

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
            <div style={{ display: "flex", gap: 8 }}>
              <CopyButton text={content ?? ""} />
            </div>
          </div>

          {/* Code content with line numbers */}
          <div style={{ overflowX: "auto", position: "relative" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: 12, lineHeight: 1.6 }}>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} style={{ transition: "background 0.1s" }}
                    onMouseEnter={undefined}
                  >
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
        </div>
      )}
    </div>
  );
}
