import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitBranch, FileText, Folder, Clock, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTree, getCommits } from "@/lib/git";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string; path: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo, path } = await params;
  return { title: `${path.slice(1).join("/")} · ${username}/${repo}` };
}

export default async function TreePage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, path } = await params;
  const branch = path[0];
  const subPath = path.slice(1).join("/");
  const pathParts = subPath ? subPath.split("/") : [];

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const [tree, commits] = await Promise.all([
    getTree(username, repoName, branch, subPath || undefined),
    getCommits(username, repoName, branch, 1),
  ]);

  const latestCommit = commits[0] ?? null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href={`/${username}/${repoName}`} style={{ fontWeight: 600, fontSize: 15, color: "var(--accent-hover)" }}>
          {repoName}
        </Link>
        <span style={{ color: "var(--text-subtle)", fontSize: 13 }}>·</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 8px" }}>
          <GitBranch size={11} /> {branch}
        </span>
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

      {/* File table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {/* Latest commit bar */}
        {latestCommit && (
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--bg-secondary)", fontSize: 12,
          }}>
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${latestCommit.author?.name ?? latestCommit.author}`}
              alt="" style={{ width: 20, height: 20, borderRadius: "50%" }}
            />
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{latestCommit.author?.name ?? latestCommit.author}</span>
            <span style={{ color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {latestCommit.message}
            </span>
            <span style={{ color: "var(--text-subtle)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {timeAgo(latestCommit.date)}
            </span>
          </div>
        )}

        {/* Parent dir link */}
        {subPath && (
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <Folder size={14} color="var(--accent)" />
            <Link
              href={pathParts.length > 1
                ? `/${username}/${repoName}/tree/${branch}/${pathParts.slice(0, -1).join("/")}`
                : `/${username}/${repoName}`}
              style={{ fontSize: 13, color: "var(--accent)" }}
            >
              ..
            </Link>
          </div>
        )}

        {tree.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No files in this directory.
          </div>
        ) : (
          tree.map((entry: { name: string; type: string }, i: number) => {
            const isDir = entry.type === "tree";
            const href = isDir
              ? `/${username}/${repoName}/tree/${branch}/${subPath ? `${subPath}/${entry.name}` : entry.name}`
              : `/${username}/${repoName}/blob/${branch}/${subPath ? `${subPath}/${entry.name}` : entry.name}`;
            return (
              <div
                key={entry.name}
                style={{
                  padding: "8px 16px",
                  borderBottom: i < tree.length - 1 ? "1px solid var(--border)" : "none",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "background 0.12s",
                }}
                className="tree-row"
              >
                {isDir
                  ? <Folder size={14} color="var(--accent)" />
                  : <FileText size={14} color="var(--text-muted)" />}
                <Link href={href} style={{ fontSize: 13, fontWeight: isDir ? 600 : 400, flex: 1 }}>
                  {entry.name}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
