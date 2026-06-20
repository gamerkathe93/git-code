import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitPullRequest, GitMerge, XCircle, Tag, CheckCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import PRActions from "@/components/repo/PRActions";
import PRTabNav from "@/components/repo/PRTabNav";
import ReviewerManager from "@/components/pulls/ReviewerManager";
import Markdown from "@/components/ui/Markdown";

type Params = { params: Promise<{ username: string; repo: string; number: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo, number } = await params;
  return { title: `PR #${number} · ${username}/${repo}` };
}

function getTextColor(bg: string): string {
  const hex = bg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export default async function PullRequestDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, number } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const pr = await (db as any).pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      reviewers: {
        include: {
          reviewer: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      labels: {
        include: {
          label: { select: { id: true, name: true, color: true, description: true } },
        },
      },
    },
  }) as {
    id: string; number: number; title: string; body: string; state: string;
    headBranch: string; baseBranch: string; isDraft: boolean;
    createdAt: Date; updatedAt: Date; closedAt: Date | null; mergedAt: Date | null;
    repoId: string; authorId: string;
    author: { username: string; name: string | null; avatarUrl: string | null };
    reviewers: Array<{
      id: string; pullRequestId: string; reviewerId: string; state: string; body: string;
      createdAt: Date; updatedAt: Date;
      reviewer: { id: string; username: string; name: string | null; avatarUrl: string | null };
    }>;
    labels: Array<{
      pullRequestId: string; labelId: string;
      label: { id: string; name: string; color: string; description: string | null };
    }>;
  } | null;
  if (!pr) notFound();

  // Fetch only non-inline (conversation) comments separately
  // Cast through any to avoid stale Prisma client type issue when schema has path field
  const rawComments = await (db as any).comment.findMany({
    where: { pullRequestId: pr.id, path: null },
    include: { author: { select: { username: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  }) as Array<{
    id: string;
    body: string;
    createdAt: Date;
    author: { username: string; name: string | null; avatarUrl: string | null };
  }>;

  // Fetch branch protection for the base branch
  const protection = await (db as any).branchProtection.findFirst({
    where: { repoId: repo.id, OR: [{ pattern: pr.baseBranch }, { pattern: "*" }] }
  }) as {
    id: string; repoId: string; pattern: string;
    requirePullRequest: boolean; requiredApprovals: number;
    requireStatusChecks: boolean; allowForcePush: boolean;
  } | null;

  let approvalCount = 0;
  let headPipeline: { status: string } | null = null;
  if (protection) {
    approvalCount = await (db as any).pRReviewer.count({
      where: { pullRequestId: pr.id, state: "approved" }
    });
    if (protection.requireStatusChecks) {
      headPipeline = await db.pipeline.findFirst({
        where: { repoId: repo.id, branch: pr.headBranch },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  const stateColor = pr.state === "merged" ? "#a371f7" : pr.state === "closed" ? "#f85149" : "#3fb950";
  const StateIcon = pr.state === "merged" ? GitMerge : pr.state === "closed" ? XCircle : GitPullRequest;

  const isOwner = session.username === username;

  // Serialize reviewers for client component
  const reviewersSerialized = pr.reviewers.map((r) => ({
    id: r.id,
    pullRequestId: r.pullRequestId,
    reviewerId: r.reviewerId,
    state: r.state,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    reviewer: {
      id: r.reviewer.id,
      username: r.reviewer.username,
      name: r.reviewer.name,
      avatarUrl: r.reviewer.avatarUrl,
    },
  }));

  const prLabels = pr.labels.map((pl) => pl.label);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          {pr.title} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>#{pr.number}</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: stateColor, background: stateColor + "22", border: `1px solid ${stateColor}44`, borderRadius: 20, padding: "3px 12px" }}>
            <StateIcon size={13} /> {pr.state}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <Link href={`/${pr.author.username}`} style={{ fontWeight: 600 }}>{pr.author.username}</Link>
            {" "}wants to merge <code style={{ fontSize: 12, background: "var(--bg-secondary)", padding: "1px 6px", borderRadius: 4 }}>{pr.headBranch}</code>
            {" "}into <code style={{ fontSize: 12, background: "var(--bg-secondary)", padding: "1px 6px", borderRadius: 4 }}>{pr.baseBranch}</code>
            {" · "}{timeAgo(pr.createdAt.toISOString())}
          </span>
        </div>
      </div>

      {/* Tab nav */}
      <PRTabNav username={username} repo={repoName} number={number} activePath="conversation" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24 }}>
        <div>
          {/* Description */}
          {pr.body && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <Markdown content={pr.body} context={{ owner: username, repo: repoName }} />
            </div>
          )}

          {/* Conversation comments (non-inline only) */}
          {rawComments.map((comment) => (
            <div key={comment.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <img
                src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border)", flexShrink: 0 }}
              />
              <div className="card" style={{ flex: 1 }}>
                <div style={{ padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <Link href={`/${comment.author.username}`} style={{ fontWeight: 600, fontSize: 13 }}>{comment.author.username}</Link>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}> commented {timeAgo(comment.createdAt.toISOString())}</span>
                </div>
                <div style={{ padding: 16 }}>
                  <Markdown content={comment.body} context={{ owner: username, repo: repoName }} />
                </div>
              </div>
            </div>
          ))}

          {/* Merge checks */}
          {protection && pr.state === "open" && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Merge checks</h3>

              {protection.requirePullRequest && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {approvalCount >= protection.requiredApprovals
                    ? <CheckCircle size={16} color="#3fb950" />
                    : <XCircle size={16} color="#f85149" />}
                  <span style={{ fontSize: 13 }}>
                    {approvalCount}/{protection.requiredApprovals} required approval(s)
                  </span>
                </div>
              )}

              {protection.requireStatusChecks && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {headPipeline?.status === "success"
                    ? <CheckCircle size={16} color="#3fb950" />
                    : <XCircle size={16} color="#f85149" />}
                  <span style={{ fontSize: 13 }}>
                    {headPipeline
                      ? `CI pipeline: ${headPipeline.status}`
                      : "No pipeline found for head branch"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PR actions */}
          <PRActions
            username={username}
            repo={repoName}
            number={pr.number}
            state={pr.state}
            isOwner={isOwner}
            isAuthor={session.userId === pr.authorId}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Author</h3>
            <Link href={`/${pr.author.username}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={pr.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pr.author.username}`} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
              <span style={{ fontSize: 13 }}>{pr.author.username}</span>
            </Link>
          </div>

          {/* Reviewers */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <ReviewerManager
              reviewers={reviewersSerialized}
              pullNumber={pr.number}
              owner={username}
              repo={repoName}
              isOwner={isOwner}
              currentUserId={session.userId}
            />
          </div>

          {/* Labels */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Labels</h3>
            {prLabels.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>None yet</span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {prLabels.map((label) => (
                  <span
                    key={label.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: label.color,
                      color: getTextColor(label.color),
                      borderRadius: 12,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                    title={label.description ?? ""}
                  >
                    <Tag size={9} /> {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
