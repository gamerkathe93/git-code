import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitBranch, GitPullRequestArrow, CircleDot, Code2, BookText, Package, Workflow, Settings2, Star, Eye, LockKeyhole, FolderGit2, Tag, Target, ArrowLeftRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/utils";
import StarButton from "@/components/repo/StarButton";
import ForkButton from "@/components/repo/ForkButton";

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

  const userFork = session
    ? await db.repository.findUnique({
        where: { ownerId_name: { ownerId: session.userId, name: repoName } },
      })
    : null;
  const alreadyForked = !!userFork && session?.username !== username;

  const lastPipeline = await db.pipeline.findFirst({
    where: { repoId: repo.id },
    orderBy: { createdAt: "desc" },
  });

  const pipelineColor: Record<string, string> = {
    success: "#3fb950", failed: "#f85149", running: "#58a6ff", pending: "#d29922", canceled: "#7d8590"
  };

  const tabs = [
    { href: `/${username}/${repoName}`, label: "Code", icon: <Code2 size={13} /> },
    { href: `/${username}/${repoName}/issues`, label: "Issues", icon: <CircleDot size={13} />, count: repo._count.issues },
    { href: `/${username}/${repoName}/labels`, label: "Labels", icon: <Tag size={13} /> },
    { href: `/${username}/${repoName}/milestones`, label: "Milestones", icon: <Target size={13} /> },
    { href: `/${username}/${repoName}/pulls`, label: "Pull Requests", icon: <GitPullRequestArrow size={13} />, count: repo._count.pullRequests },
    { href: `/${username}/${repoName}/pipelines`, label: "Pipelines", icon: <Workflow size={13} /> },
    { href: `/${username}/${repoName}/releases`, label: "Releases", icon: <Package size={13} /> },
    { href: `/${username}/${repoName}/tags`, label: "Tags", icon: <Tag size={13} /> },
    { href: `/${username}/${repoName}/compare`, label: "Compare", icon: <ArrowLeftRight size={13} /> },
    { href: `/${username}/${repoName}/wiki`, label: "Wiki", icon: <BookText size={13} /> },
    ...(session.username === username ? [{ href: `/${username}/${repoName}/settings`, label: "Settings", icon: <Settings2 size={13} /> }] : []),
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb + actions */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FolderGit2 size={16} color="var(--text-muted)" />
            <Link href={`/${username}`} style={{ color: "var(--accent)", fontSize: 18, fontWeight: 500 }}>
              {username}
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: 18 }}>/</span>
            <Link href={`/${username}/${repoName}`} style={{ color: "var(--accent)", fontSize: 18, fontWeight: 700 }}>
              {repoName}
            </Link>
            {repo.isPrivate && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "1px 8px" }}>
                <LockKeyhole size={10} /> Private
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
            <ForkButton
              username={username}
              repo={repoName}
              initialCount={repo.forksCount}
              currentUserFork={alreadyForked ? session?.username : null}
            />
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
