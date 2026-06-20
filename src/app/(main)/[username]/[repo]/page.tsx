import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GitBranch, FileCode2, Folder, Clock, SquareTerminal, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTree, getCommits, getFileContent, hasAnyCommit, getCloneUrls } from "@/lib/git";
import { timeAgo, getLanguageColor } from "@/lib/utils";
import Markdown from "@/components/ui/Markdown";
import HealthScore from "@/components/repo/HealthScore";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `${username}/${repo}` };
}

export default async function RepoCodePage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
    include: {
      owner: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { stars: true, issues: true, pullRequests: true } },
    },
  });

  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const hasCommits = await hasAnyCommit(username, repoName);
  const [tree, commits] = hasCommits
    ? await Promise.all([
        getTree(username, repoName, repo.defaultBranch),
        getCommits(username, repoName, repo.defaultBranch, 1),
      ])
    : [[], []];

  const latestCommit = commits[0] ?? null;

  let readme: string | null = null;
  if (hasCommits) {
    for (const name of ["README.md", "readme.md", "Readme.md"]) {
      readme = await getFileContent(username, repoName, name, repo.defaultBranch);
      if (readme) break;
    }
  }

  const cloneUrls = getCloneUrls(username, repoName, process.env.NEXT_PUBLIC_APP_URL);
  const topics: string[] = JSON.parse(repo.topics || "[]");

  const isStarred = await db.star.findUnique({
    where: { userId_repoId: { userId: session.userId, repoId: repo.id } },
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
        <div>
          {hasCommits ? (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <button className="btn btn-sm" style={{ gap: 6 }}>
                  <GitBranch size={13} /> {repo.defaultBranch}
                </button>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{tree.length} files</span>
              </div>

              {latestCommit && (
                <div className="card" style={{ padding: "10px 16px", marginBottom: 2, display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${latestCommit.author.name}`}
                    alt=""
                    style={{ width: 20, height: 20, borderRadius: "50%" }}
                  />
                  <span style={{ fontSize: 13, flex: 1 }}>{latestCommit.message}</span>
                  <code style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{latestCommit.shortSha}</code>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(latestCommit.date)}</span>
                </div>
              )}

              <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
                {tree.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Empty repository</div>
                ) : (
                  tree.map((entry, i) => (
                    <div key={entry.path} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < tree.length - 1 ? "1px solid var(--border)" : "none" }}>
                      {entry.type === "tree"
                        ? <Folder size={16} color="#58a6ff" />
                        : <FileCode2 size={16} color="var(--text-muted)" />}
                      <Link
                        href={entry.type === "tree"
                          ? `/${username}/${repoName}/tree/${repo.defaultBranch}/${entry.path}`
                          : `/${username}/${repoName}/blob/${repo.defaultBranch}/${entry.path}`}
                        style={{ flex: 1, fontSize: 13, fontWeight: entry.type === "tree" ? 600 : 400 }}
                      >
                        {entry.name}
                      </Link>
                    </div>
                  ))
                )}
              </div>

              {readme && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                    <FileCode2 size={16} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>README.md</span>
                  </div>
                  <Markdown content={readme.length > 5000 ? readme.slice(0, 5000) + "\n\n[truncated…]" : readme} />
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Quick setup</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
                Get started by pushing an existing repository from the command line.
              </p>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <SquareTerminal size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>HTTPS</span>
                </div>
                <code style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace" }}>{cloneUrls.http}</code>
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 10 }}>…create a new repository on the command line</h3>
              <pre style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: 16, fontSize: 12, fontFamily: "monospace", overflowX: "auto" }}>{`echo "# ${repoName}" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M ${repo.defaultBranch}
git remote add origin ${cloneUrls.http}
git push -u origin ${repo.defaultBranch}`}</pre>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <HealthScore owner={username} repo={repoName} />
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>About</h3>
            {repo.description && (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>{repo.description}</p>
            )}
            {topics.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {topics.map((t) => (
                  <span key={t} style={{ fontSize: 11, background: "rgba(56,139,253,0.1)", color: "#58a6ff", borderRadius: 20, padding: "2px 10px" }}>{t}</span>
                ))}
              </div>
            )}
            {repo.license && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>⚖️ {repo.license}</div>}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>⭐ Stars</span>
                <strong>{repo._count.stars}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>🐛 Issues</span>
                <Link href={`/${username}/${repoName}/issues`} style={{ fontWeight: 600 }}>{repo._count.issues}</Link>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>🔀 Pull Requests</span>
                <Link href={`/${username}/${repoName}/pulls`} style={{ fontWeight: 600 }}>{repo._count.pullRequests}</Link>
              </div>
            </div>
            {repo.language && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: getLanguageColor(repo.language) }} />
                {repo.language}
              </div>
            )}
          </div>

          {hasCommits && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Clone</h3>
                <a
                  href={`/api/repos/${username}/${repoName}/archive?ref=${encodeURIComponent(repo.defaultBranch)}&format=zip`}
                  className="btn btn-sm"
                  download
                  style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontSize: 11 }}
                >
                  <Download size={11} /> ZIP
                </a>
              </div>
              <code style={{ fontSize: 11, wordBreak: "break-all", color: "var(--text)", background: "var(--bg)", display: "block", padding: 10, borderRadius: 6, border: "1px solid var(--border)" }}>
                {cloneUrls.http}
              </code>
            </div>
          )}

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} color="var(--text-muted)" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Updated {timeAgo(repo.updatedAt.toISOString())}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              {isStarred ? "⭐ You starred this" : "☆ Star this repository"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
