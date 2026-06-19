import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitPullRequest, GitMerge, XCircle, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string }>; searchParams: Promise<{ state?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Pull Requests · ${username}/${repo}` };
}

function StateIcon({ state }: { state: string }) {
  if (state === "merged") return <GitMerge size={16} color="#a78bfa" />;
  if (state === "closed") return <XCircle size={16} color="#f87171" />;
  return <GitPullRequest size={16} color="#22c55e" />;
}

export default async function PullsPage({ params, searchParams }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;
  const { state: stateParam } = await searchParams;
  const showClosed = stateParam === "closed";

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  if (repo.isPrivate && session.username !== username) return notFound();

  const [pulls, openCount, closedCount] = await Promise.all([
    db.pullRequest.findMany({
      where: {
        repoId: repo.id,
        state: showClosed ? { in: ["closed", "merged"] } : "open",
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.pullRequest.count({ where: { repoId: repo.id, state: "open" } }),
    db.pullRequest.count({ where: { repoId: repo.id, state: { in: ["closed", "merged"] } } }),
  ]);

  return (
    <div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href={`/${username}/${repoName}/pulls`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: !showClosed ? 700 : 400,
              color: !showClosed ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <GitPullRequest size={14} color={!showClosed ? "#22c55e" : "var(--text-muted)"} />
              {openCount} Open
            </Link>
            <Link href={`/${username}/${repoName}/pulls?state=closed`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: showClosed ? 700 : 400,
              color: showClosed ? "var(--text)" : "var(--text-muted)",
              textDecoration: "none",
            }}>
              <GitMerge size={14} color={showClosed ? "#a78bfa" : "var(--text-muted)"} />
              {closedCount} Closed
            </Link>
          </div>
          <Link href={`/${username}/${repoName}/pulls/new`} className="btn btn-primary btn-sm">
            <Plus size={13} /> New pull request
          </Link>
        </div>

        {pulls.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <GitPullRequest size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>{showClosed ? "No closed pull requests" : "No open pull requests"}</p>
          </div>
        ) : (
          pulls.map((pr: any, i: number) => (
            <div key={pr.id} style={{
              padding: "12px 16px",
              borderBottom: i < pulls.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", gap: 12,
            }}>
              <StateIcon state={pr.state} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <Link href={`/${username}/${repoName}/pulls/${pr.number}`} style={{ fontWeight: 600, fontSize: 14 }}>
                    {pr.title}
                  </Link>
                  {pr.isDraft && (
                    <span className="badge badge-draft">Draft</span>
                  )}
                  {pr.state === "merged" && (
                    <span className="badge badge-merged">Merged</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  #{pr.number} ·{" "}
                  <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>{pr.headBranch}</code>
                  {" → "}
                  <code style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>{pr.baseBranch}</code>
                  {" · opened "}{timeAgo(pr.createdAt.toISOString())} by{" "}
                  <Link href={`/${pr.author.username}`} style={{ fontWeight: 600 }}>{pr.author.username}</Link>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {pr._count.comments > 0 && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>💬 {pr._count.comments}</span>
                )}
                <img
                  src={pr.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pr.author.username}`}
                  alt={pr.author.username}
                  style={{ width: 20, height: 20, borderRadius: 6 }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
