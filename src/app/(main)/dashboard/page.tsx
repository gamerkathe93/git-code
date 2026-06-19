import type { Metadata } from "next";
import Link from "next/link";
import { GitBranch, GitPullRequestArrow, CircleDot, Star, Lock, FolderGit2, Plus, Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo, getLanguageColor, formatNumber } from "@/lib/utils";
import StarButton from "@/components/repo/StarButton";

export const metadata: Metadata = { title: "Dashboard" };

function PipelineStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "#3fb950", failed: "#f85149", running: "#58a6ff",
    pending: "#d29922", canceled: "#7d8590",
  };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || "#7d8590", display: "inline-block", flexShrink: 0 }} />;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { _count: { select: { repositories: true, notifications: true } } },
  });
  if (!user) redirect("/login");

  const [myRepos, openIssues, openPRs, recentPipelines, unreadNotifs, userStars] = await Promise.all([
    db.repository.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { _count: { select: { stars: true } } },
    }),
    db.issue.count({ where: { repo: { ownerId: user.id }, state: "open" } }),
    db.pullRequest.count({ where: { repo: { ownerId: user.id }, state: "open" } }),
    db.pipeline.findMany({
      where: { repo: { ownerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { repo: true },
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
    db.star.findMany({ where: { userId: user.id }, select: { repoId: true } }),
  ]);
  const starredIds = new Set(userStars.map((s: { repoId: string }) => s.repoId));

  const stats = [
    { label: "Repositories", value: myRepos.length, icon: <FolderGit2 size={16} />, href: "/repositories", color: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
    { label: "Open PRs", value: openPRs, icon: <GitPullRequestArrow size={16} />, href: "/dashboard", color: "#22c55e", glow: "rgba(34,197,94,0.15)" },
    { label: "Open Issues", value: openIssues, icon: <CircleDot size={16} />, href: "/dashboard", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
    { label: "Notifications", value: unreadNotifs, icon: <Bell size={16} />, href: "/notifications", color: "#f87171", glow: "rgba(248,113,113,0.15)" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 3 }}>Welcome back, <span style={{ color: "var(--text)", fontWeight: 500 }}>{user.name}</span></p>
        </div>
        <Link href="/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> New repository
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {stats.map((s) => (
              <Link key={s.label} href={s.href} className="card card-hover" style={{
                padding: "14px 16px", textDecoration: "none", display: "block",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  width: 60, height: 60,
                  background: `radial-gradient(circle at 100% 0%, ${s.glow} 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, borderRadius: 8, marginBottom: 10,
                  background: `${s.glow}`,
                  border: `1px solid ${s.color}30`,
                  color: s.color,
                }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </Link>
            ))}
          </div>

          {/* Repositories */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Your repositories</h2>
              <Link href="/repositories" style={{ fontSize: 12, color: "var(--accent)" }}>View all</Link>
            </div>
            {myRepos.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                <FolderGit2 size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ marginBottom: 12 }}>You don&apos;t have any repositories yet.</p>
                <Link href="/new" className="btn btn-primary btn-sm">Create your first repo</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {myRepos.map((repo: any, i: number) => (
                  <div key={repo.id} style={{ padding: "14px 0", borderBottom: i < myRepos.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Link href={`/${session.username}/${repo.name}`} style={{ fontWeight: 600, fontSize: 14 }}>
                          {repo.name}
                        </Link>
                        {repo.isPrivate && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "1px 6px" }}>
                            <Lock size={9} /> Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6 }}>{repo.description}</p>
                      )}
                      <div style={{ display: "flex", gap: 12 }}>
                        {repo.language && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: getLanguageColor(repo.language) }} />
                            {repo.language}
                          </span>
                        )}
                        {repo._count.stars > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)" }}>
                            <Star size={11} /> {formatNumber(repo._count.stars)}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Updated {timeAgo(repo.updatedAt.toISOString())}</span>
                      </div>
                    </div>
                    <StarButton
                      username={session.username}
                      repo={repo.name}
                      initialCount={repo._count.stars}
                      initialStarred={starredIds.has(repo.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Pipelines */}
          {recentPipelines.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent pipelines</h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {recentPipelines.map((p: any, i: number) => (
                  <div key={p.id} style={{ padding: "12px 16px", borderBottom: i < recentPipelines.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                    <PipelineStatusDot status={p.status} />
                    <Link href={`/${session.username}/${p.repo.name}/pipelines/${p.id}`} style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                      {p.repo.name} — {p.branch}
                    </Link>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(p.createdAt.toISOString())}</span>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Profile card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              height: 60,
              background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))",
              borderBottom: "1px solid var(--border)",
            }} />
            <div style={{ padding: "0 16px 16px" }}>
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                alt={user.username}
                style={{
                  width: 52, height: 52, borderRadius: 12,
                  border: "3px solid var(--bg-secondary)",
                  marginTop: -26, display: "block",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>@{user.username}</div>
              </div>
              {user.bio && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>{user.bio}</p>}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text)" }}>{user._count.repositories}</strong> repos
                </span>
              </div>
              <Link href={`/${session.username}`} className="btn btn-sm" style={{ marginTop: 12, width: "100%", justifyContent: "center", fontSize: 12 }}>
                View profile
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href="/new" className="btn btn-sm" style={{ justifyContent: "flex-start", fontSize: 12 }}>
                <Plus size={12} /> New repository
              </Link>
              <Link href="/notifications" className="btn btn-sm" style={{ justifyContent: "flex-start", fontSize: 12 }}>
                <Bell size={12} /> Notifications {unreadNotifs > 0 && (
                  <span style={{
                    background: "linear-gradient(135deg, #ef4444, #f97316)",
                    color: "#fff", borderRadius: 10, padding: "0 5px",
                    fontSize: 10, fontWeight: 700, marginLeft: "auto",
                  }}>{unreadNotifs}</span>
                )}
              </Link>
              <Link href={`/${session.username}`} className="btn btn-sm" style={{ justifyContent: "flex-start", fontSize: 12 }}>
                <GitBranch size={12} /> Your profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
