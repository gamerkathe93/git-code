import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitBranch, GitPullRequest, CircleDot, BookOpen, Tag, Play, Settings, Star, Eye, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import StarButton from "@/components/repo/StarButton";

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string; repo: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
    include: {
      owner: { select: { username: true } },
      _count: { select: { stars: true, issues: true, pullRequests: true } },
    },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const starRecord = await db.star.findUnique({
    where: { userId_repoId: { userId: session.userId, repoId: repo.id } },
  });
  const isStarred = !!starRecord;

  const lastPipeline = await db.pipeline.findFirst({
    where: { repoId: repo.id },
    orderBy: { createdAt: "desc" },
  });

  const pipelineColor: Record<string, string> = {
    success: "#3fb950", failed: "#f85149", running: "#58a6ff", pending: "#d29922", canceled: "#7d8590"
  };

  const tabs = [
    { href: `/${username}/${repoName}`, label: "Code", icon: <BookOpen size={13} /> },
    { href: `/${username}/${repoName}/issues`, label: "Issues", icon: <CircleDot size={13} />, count: repo._count.issues },
    { href: `/${username}/${repoName}/pulls`, label: "Pull Requests", icon: <GitPullRequest size={13} />, count: repo._count.pullRequests },
    { href: `/${username}/${repoName}/pipelines`, label: "Pipelines", icon: <Play size={13} /> },
    { href: `/${username}/${repoName}/releases`, label: "Releases", icon: <Tag size={13} /> },
    { href: `/${username}/${repoName}/wiki`, label: "Wiki", icon: <BookOpen size={13} /> },
    ...(session.username === username ? [{ href: `/${username}/${repoName}/settings`, label: "Settings", icon: <Settings size={13} /> }] : []),
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb + actions */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={16} color="var(--text-muted)" />
            <Link href={`/${username}`} style={{ color: "var(--accent)", fontSize: 18, fontWeight: 500 }}>
              {username}
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: 18 }}>/</span>
            <Link href={`/${username}/${repoName}`} style={{ color: "var(--accent)", fontSize: 18, fontWeight: 700 }}>
              {repoName}
            </Link>
            {repo.isPrivate && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "1px 8px" }}>
                <Lock size={10} /> Private
              </span>
            )}
            {lastPipeline && (
              <span style={{ fontSize: 11, color: pipelineColor[lastPipeline.status] || "#7d8590", border: `1px solid ${pipelineColor[lastPipeline.status] || "#7d8590"}44`, borderRadius: 20, padding: "1px 8px" }}>
                ● {lastPipeline.status}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-sm"><Eye size={12} /> Watch</button>
            <StarButton username={username} repo={repoName} initialCount={repo._count.stars} initialStarred={isStarred} />
            <button className="btn btn-sm"><GitBranch size={12} /> Fork</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="tab">
              {tab.icon} {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-count">{tab.count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
