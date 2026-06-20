import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CircleDot, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import IssueCommentForm from "@/components/issues/IssueCommentForm";
import Markdown from "@/components/ui/Markdown";
import ReactionBar from "@/components/ui/ReactionBar";

type Params = { params: Promise<{ username: string; repo: string; number: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { number } = await params;
  return { title: `Issue #${number}` };
}

export default async function IssueDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, number } = await params;
  const issueNumber = parseInt(number);

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const issue = await (db as any).issue.findUnique({
    where: { repoId_number: { repoId: repo.id, number: issueNumber } },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      labels: { include: { label: true } },
      milestone: { select: { title: true, dueDate: true } },
      assignees: true,
      comments: {
        include: {
          author: { select: { username: true, name: true, avatarUrl: true } },
          reactions: { include: { user: { select: { id: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!issue) notFound();

  // isAuthor = issue author OR repo owner can close/reopen
  const isAuthor = session.username === issue.author.username || session.username === username;

  function aggregateReactions(reactions: any[], currentUserId: string | undefined): { emoji: string; count: number; hasReacted: boolean }[] {
    const map: Record<string, { count: number; hasReacted: boolean }> = {};
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, hasReacted: false };
      map[r.emoji].count++;
      if (currentUserId && r.user.id === currentUserId) map[r.emoji].hasReacted = true;
    });
    return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }));
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
          {issue.title}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>#{issue.number}</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`badge badge-${issue.state === "open" ? "open" : "closed"}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {issue.state === "open" ? <CircleDot size={12} /> : <CheckCircle2 size={12} />}
            {issue.state}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            <Link href={`/${issue.author.username}`} style={{ fontWeight: 600 }}>{issue.author.username}</Link>
            {" "}opened this issue {timeAgo(issue.createdAt.toISOString())} · {issue.comments.length} comment{issue.comments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24 }}>
        {/* Comments thread */}
        <div>
          {/* Issue body */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <img
              src={issue.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${issue.author.username}`}
              alt=""
              style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }}
            />
            <div className="card" style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  <Link href={`/${issue.author.username}`}>{issue.author.username}</Link>
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> commented {timeAgo(issue.createdAt.toISOString())}</span>
                </span>
                {isAuthor && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Author</span>}
              </div>
              <div style={{ padding: 16 }}>
                {issue.body ? (
                  <Markdown content={issue.body} context={{ owner: username, repo: repoName }} />
                ) : (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>No description provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          {issue.comments.map((comment: any) => (
            <div key={comment.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <img
                src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }}
              />
              <div className="card" style={{ flex: 1 }}>
                <div style={{ padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    <Link href={`/${comment.author.username}`}>{comment.author.username}</Link>
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> commented {timeAgo(comment.createdAt.toISOString())}</span>
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <Markdown content={comment.body} context={{ owner: username, repo: repoName }} />
                  <ReactionBar
                    commentId={comment.id}
                    reactions={aggregateReactions(comment.reactions, session?.userId)}
                    currentUserId={session?.userId}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Comment form */}
          <IssueCommentForm
            username={username}
            repo={repoName}
            issueNumber={issueNumber}
            issueState={issue.state}
            isAuthor={isAuthor}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Labels</h3>
            {issue.labels.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {issue.labels.map((il: any) => (
                  <span key={il.labelId} style={{ fontSize: 11, background: il.label.color + "33", color: il.label.color, borderRadius: 20, padding: "2px 8px", border: `1px solid ${il.label.color}55` }}>
                    {il.label.name}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>None yet</span>
            )}
          </div>

          {issue.milestone && (
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Milestone</h3>
              <span style={{ fontSize: 13 }}>{issue.milestone.title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
