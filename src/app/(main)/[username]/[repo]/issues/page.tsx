import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CircleDot, CheckCircle2, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string }>; searchParams: Promise<{ state?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Issues · ${username}/${repo}` };
}

export default async function IssuesPage({ params, searchParams }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;
  const { state: stateParam } = await searchParams;
  const activeState = stateParam === "closed" ? "closed" : "open";

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
    include: { labels: true },
  });
  if (!repo) notFound();

  // Private repo check
  if (repo.isPrivate && session.username !== username) {
    return notFound();
  }

  const [issues, openCount, closedCount] = await Promise.all([
    db.issue.findMany({
      where: { repoId: repo.id, state: activeState },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        labels: { include: { label: true } },
        milestone: { select: { title: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.issue.count({ where: { repoId: repo.id, state: "open" } }),
    db.issue.count({ where: { repoId: repo.id, state: "closed" } }),
  ]);

  return (
    <div>
      {repo.labels.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {repo.labels.map((l: any) => (
            <Link key={l.id} href={`/${username}/${repoName}/issues?label=${l.name}`} style={{
              fontSize: 11, background: l.color + "22", color: l.color,
              borderRadius: 20, padding: "2px 10px", border: `1px solid ${l.color}44`,
              textDecoration: "none", fontWeight: 500,
            }}>
              {l.name}
            </Link>
          ))}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href={`/${username}/${repoName}/issues`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: activeState === "open" ? 700 : 400,
              color: activeState === "open" ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <CircleDot size={14} color={activeState === "open" ? "#22c55e" : "var(--text-muted)"} />
              {openCount} Open
            </Link>
            <Link href={`/${username}/${repoName}/issues?state=closed`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: activeState === "closed" ? 700 : 400,
              color: activeState === "closed" ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <CheckCircle2 size={14} color={activeState === "closed" ? "#a78bfa" : "var(--text-muted)"} />
              {closedCount} Closed
            </Link>
          </div>
          <Link href={`/${username}/${repoName}/issues/new`} className="btn btn-primary btn-sm">
            <Plus size={13} /> New issue
          </Link>
        </div>

        {issues.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <CircleDot size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ marginBottom: 12 }}>
              {activeState === "open" ? "No open issues" : "No closed issues"}
            </p>
            {activeState === "open" && (
              <Link href={`/${username}/${repoName}/issues/new`} className="btn btn-primary btn-sm">Open an issue</Link>
            )}
          </div>
        ) : (
          issues.map((issue: any, i: number) => (
            <div key={issue.id} style={{
              padding: "12px 16px",
              borderBottom: i < issues.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", gap: 12,
              transition: "background 0.12s",
            }}
              onMouseEnter={undefined}
            >
              {issue.state === "open"
                ? <CircleDot size={16} color="#22c55e" style={{ marginTop: 2, flexShrink: 0 }} />
                : <CheckCircle2 size={16} color="#a78bfa" style={{ marginTop: 2, flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/${username}/${repoName}/issues/${issue.number}`} style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>
                    {issue.title}
                  </Link>
                  {issue.labels.map((il: any) => (
                    <span key={il.labelId} style={{
                      fontSize: 11, background: il.label.color + "22", color: il.label.color,
                      borderRadius: 20, padding: "1px 8px", border: `1px solid ${il.label.color}44`,
                      whiteSpace: "nowrap", fontWeight: 500,
                    }}>
                      {il.label.name}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  #{issue.number} {activeState === "open" ? "opened" : "closed"} {timeAgo(issue.createdAt.toISOString())} by{" "}
                  <Link href={`/${issue.author.username}`} style={{ fontWeight: 600 }}>{issue.author.username}</Link>
                  {issue.milestone && <> · <span style={{ color: "var(--accent-hover)" }}>{issue.milestone.title}</span></>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {issue._count.comments > 0 && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>💬 {issue._count.comments}</span>
                )}
                <img
                  src={issue.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${issue.author.username}`}
                  alt={issue.author.username}
                  style={{ width: 20, height: 20, borderRadius: 6, border: "1px solid var(--border)" }}
                  title={issue.author.username}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
