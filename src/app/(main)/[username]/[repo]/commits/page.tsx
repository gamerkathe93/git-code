import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitCommit } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCommits } from "@/lib/git";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Commits · ${username}/${repo}` };
}

export default async function CommitsPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const commits = await getCommits(username, repoName, repo.defaultBranch, 50);

  // Group by date
  const grouped: Record<string, typeof commits> = {};
  for (const c of commits) {
    const date = new Date(c.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(c);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
        Commits on <span style={{ color: "var(--accent)" }}>{repo.defaultBranch}</span>
      </h1>

      {commits.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <GitCommit size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No commits yet. Push your first commit to see it here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayCommits]) => (
          <div key={date} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border)", display: "inline-block" }} />
              Commits on {date}
            </h2>
            <div className="card" style={{ overflow: "hidden" }}>
              {dayCommits.map((commit, i) => (
                <div key={commit.sha} style={{ padding: "14px 16px", borderBottom: i < dayCommits.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <GitCommit size={16} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {commit.message.split("\n")[0]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${commit.author.name}`}
                        alt=""
                        style={{ width: 16, height: 16, borderRadius: "50%", verticalAlign: "middle", marginRight: 4 }}
                      />
                      {commit.author.name} · {timeAgo(commit.date)}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <code style={{ fontSize: 12, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", fontFamily: "monospace" }}>
                      {commit.shortSha}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
