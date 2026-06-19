import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitPullRequest, GitMerge, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import PRActions from "@/components/repo/PRActions";

type Params = { params: Promise<{ username: string; repo: string; number: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo, number } = await params;
  return { title: `PR #${number} · ${username}/${repo}` };
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

  const pr = await db.pullRequest.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
    include: {
      author: { select: { username: true, name: true, avatarUrl: true } },
      comments: {
        include: { author: { select: { username: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!pr) notFound();

  const stateColor = pr.state === "merged" ? "#a371f7" : pr.state === "closed" ? "#f85149" : "#3fb950";
  const StateIcon = pr.state === "merged" ? GitMerge : pr.state === "closed" ? XCircle : GitPullRequest;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24 }}>
        <div>
          {/* Description */}
          {pr.body && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6 }}>{pr.body}</pre>
            </div>
          )}

          {/* Comments */}
          {(pr.comments as any[]).map((comment: any) => (
            <div key={comment.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <img src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border)", flexShrink: 0 }} />
              <div className="card" style={{ flex: 1 }}>
                <div style={{ padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <Link href={`/${comment.author.username}`} style={{ fontWeight: 600, fontSize: 13 }}>{comment.author.username}</Link>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}> commented {timeAgo(comment.createdAt.toISOString())}</span>
                </div>
                <div style={{ padding: 16 }}>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14 }}>{comment.body}</pre>
                </div>
              </div>
            </div>
          ))}

          {/* PR actions */}
          <PRActions
            username={username}
            repo={repoName}
            number={pr.number}
            state={pr.state}
            isOwner={session.username === username}
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
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Labels</h3>
            <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>None yet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
