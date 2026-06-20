import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CircleDot, CheckCircle2, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import FilterDropdown from "@/components/issues/FilterDropdown";
import KanbanBoard from "@/components/issues/KanbanBoard";

type Params = {
  params: Promise<{ username: string; repo: string }>;
  searchParams: Promise<{ state?: string; label?: string; assignee?: string; milestone?: string; author?: string; view?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Issues · ${username}/${repo}` };
}

export default async function IssuesPage({ params, searchParams }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;
  const { state: stateParam, label, assignee, milestone, author, view } = await searchParams;
  const showClosed = stateParam === "closed";
  const showKanban = view === "kanban";

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  // Private repo check
  if (repo.isPrivate && session.username !== username) {
    return notFound();
  }

  const filterWhere: any = { repoId: repo.id, state: showClosed ? "closed" : "open" };

  if (label) {
    filterWhere.labels = { some: { label: { name: label } } };
  }
  if (assignee) {
    filterWhere.assignees = { some: { assignee: { username: assignee } } };
  }
  if (milestone) {
    filterWhere.milestone = { title: milestone };
  }
  if (author) {
    filterWhere.author = { username: author };
  }

  // Fetch kanban issues (all open, no filters) when in board view
  let kanbanIssues: any[] = [];
  if (showKanban) {
    kanbanIssues = await (db as any).issue.findMany({
      where: { repoId: repo.id, state: "open" },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const [issues, openCount, closedCount, labels, milestones] = await Promise.all([
    db.issue.findMany({
      where: filterWhere,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        labels: { include: { label: true } },
        assignees: { include: { assignee: { select: { username: true } } } },
        milestone: { select: { title: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.issue.count({ where: { repoId: repo.id, state: "open" } }),
    db.issue.count({ where: { repoId: repo.id, state: "closed" } }),
    db.label.findMany({ where: { repoId: repo.id }, orderBy: { name: "asc" } }),
    db.milestone.findMany({ where: { repoId: repo.id, state: "open" }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href={`/${username}/${repoName}/issues`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: !showClosed ? 700 : 400,
              color: !showClosed ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <CircleDot size={14} color={!showClosed ? "#22c55e" : "var(--text-muted)"} />
              {openCount} Open
            </Link>
            <Link href={`/${username}/${repoName}/issues?state=closed`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: showClosed ? 700 : 400,
              color: showClosed ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <CheckCircle2 size={14} color={showClosed ? "#a78bfa" : "var(--text-muted)"} />
              {closedCount} Closed
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Filter dropdowns — right side of header */}
            <div style={{ display: "flex", gap: 8 }}>
              {/* Label filter */}
              <FilterDropdown
                label="Label"
                value={label}
                options={labels.map((l: any) => ({ value: l.name, label: l.name, color: l.color }))}
                paramName="label"
                currentParams={{ state: stateParam, assignee, milestone, author }}
                basePath={`/${username}/${repoName}/issues`}
              />
              {/* Milestone filter */}
              <FilterDropdown
                label="Milestone"
                value={milestone}
                options={milestones.map((m: any) => ({ value: m.title, label: m.title }))}
                paramName="milestone"
                currentParams={{ state: stateParam, label, assignee, author }}
                basePath={`/${username}/${repoName}/issues`}
              />
              {/* Author filter badge */}
              {author && (
                <Link
                  href={`/${username}/${repoName}/issues?state=${stateParam || "open"}`}
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  Author: {author} ✕
                </Link>
              )}
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              <Link href={`/${username}/${repoName}/issues`} style={{ padding: "4px 10px", fontSize: 12, background: !showKanban ? "rgba(255,255,255,0.1)" : "none", color: !showKanban ? "var(--text)" : "var(--text-muted)", textDecoration: "none" }}>≡ List</Link>
              <Link href={`/${username}/${repoName}/issues?view=kanban`} style={{ padding: "4px 10px", fontSize: 12, background: showKanban ? "rgba(255,255,255,0.1)" : "none", color: showKanban ? "var(--text)" : "var(--text-muted)", textDecoration: "none", borderLeft: "1px solid var(--border)" }}>⊞ Board</Link>
            </div>

            <Link href={`/${username}/${repoName}/issues/new`} className="btn btn-primary btn-sm">
              <Plus size={13} /> New issue
            </Link>
          </div>
        </div>

        {showKanban ? (
          <div style={{ padding: 16 }}>
            <KanbanBoard issues={kanbanIssues} owner={username} repo={repoName} />
          </div>
        ) : (
          <>
            {issues.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <CircleDot size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ marginBottom: 12 }}>
                  {showClosed ? "No closed issues" : "No open issues"}
                  {(label || assignee || milestone || author) && " matching the selected filters"}
                </p>
                {!showClosed && !label && !assignee && !milestone && !author && (
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
                }}>
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
                        <span key={il.label.id} style={{
                          fontSize: 11, padding: "1px 6px", borderRadius: 10,
                          background: `#${il.label.color}33`, color: `#${il.label.color}`,
                          border: `1px solid #${il.label.color}44`,
                        }}>
                          {il.label.name}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      #{issue.number} {!showClosed ? "opened" : "closed"} {timeAgo(issue.createdAt.toISOString())} by{" "}
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
          </>
        )}
      </div>
    </div>
  );
}
