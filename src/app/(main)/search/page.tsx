import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, BookMarked, User, CircleDot, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getLanguageColor } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

type SearchParams = Promise<{ q?: string; type?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q = "", type = "all" } = await searchParams;

  let repos: {
    id: string;
    name: string;
    description: string | null;
    starsCount: number;
    language: string | null;
    owner: { username: string };
  }[] = [];
  let users: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  }[] = [];
  let issues: {
    id: string;
    number: number;
    title: string;
    state: string;
    repo: { name: string; owner: { username: string } };
  }[] = [];

  if (q.trim()) {
    [repos, users, issues] = await Promise.all([
      db.repository.findMany({
        where: {
          isPrivate: false,
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        select: {
          id: true,
          name: true,
          description: true,
          starsCount: true,
          language: true,
          owner: { select: { username: true } },
        },
        take: 5,
      }),
      db.user.findMany({
        where: {
          OR: [{ username: { contains: q } }, { name: { contains: q } }],
        },
        select: { id: true, username: true, name: true, avatarUrl: true },
        take: 5,
      }),
      db.issue.findMany({
        where: {
          repo: { isPrivate: false },
          title: { contains: q },
        },
        select: {
          id: true,
          number: true,
          title: true,
          state: true,
          repo: {
            select: {
              name: true,
              owner: { select: { username: true } },
            },
          },
        },
        take: 5,
      }),
    ]);
  }

  const tabs = [
    { key: "all", label: "All", count: repos.length + users.length + issues.length },
    { key: "repos", label: "Repositories", count: repos.length },
    { key: "users", label: "Users", count: users.length },
    { key: "issues", label: "Issues", count: issues.length },
  ];

  const showRepos = type === "all" || type === "repos";
  const showUsers = type === "all" || type === "users";
  const showIssues = type === "all" || type === "issues";

  const baseHref = q ? `/search?q=${encodeURIComponent(q)}` : "/search";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {q ? (
            <>Search results for <span style={{ color: "var(--accent-hover)" }}>&ldquo;{q}&rdquo;</span></>
          ) : (
            "Search"
          )}
        </h1>
        {q && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {repos.length + users.length + issues.length} results
          </p>
        )}
      </div>

      {!q.trim() ? (
        /* Empty state */
        <div className="card" style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>
          <Search size={40} style={{ marginBottom: 16, opacity: 0.25, display: "block", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Enter a search query above</p>
          <p style={{ fontSize: 13 }}>Search across repositories, users, and issues.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          {/* Sidebar tabs */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {tabs.map((tab) => (
                <Link
                  key={tab.key}
                  href={`${baseHref}&type=${tab.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: type === tab.key ? 600 : 400,
                    color: type === tab.key ? "var(--text)" : "var(--text-muted)",
                    background: type === tab.key ? "rgba(255,255,255,0.06)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.12s",
                    border: type === tab.key ? "1px solid var(--border)" : "1px solid transparent",
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}>
                      {tab.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Repositories */}
            {showRepos && repos.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <BookMarked size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Repositories
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {repos.map((repo) => (
                    <Link
                      key={repo.id}
                      href={`/${repo.owner.username}/${repo.name}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div className="card card-hover" style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--accent-hover)", marginBottom: 4 }}>
                              {repo.owner.username}/{repo.name}
                            </div>
                            {repo.description && (
                              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                                {repo.description}
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, fontSize: 12, color: "var(--text-muted)" }}>
                            {repo.language && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: getLanguageColor(repo.language) }} />
                                {repo.language}
                              </span>
                            )}
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Star size={12} />
                              {repo.starsCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {showUsers && users.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <User size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Users
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.map((u) => (
                    <Link key={u.id} href={`/${u.username}`} style={{ textDecoration: "none" }}>
                      <div className="card card-hover" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--accent-hover)" }}>{u.username}</div>
                          {u.name && u.name !== u.username && (
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{u.name}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {showIssues && issues.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <CircleDot size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Issues
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {issues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/${issue.repo.owner.username}/${issue.repo.name}/issues/${issue.number}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div className="card card-hover" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                        <CircleDot
                          size={16}
                          color={issue.state === "open" ? "var(--success)" : "var(--danger-text)"}
                          style={{ flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>
                            {issue.title}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {issue.repo.owner.username}/{issue.repo.name} #{issue.number}
                          </div>
                        </div>
                        <span style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "2px 8px",
                          borderRadius: 20,
                          flexShrink: 0,
                          background: issue.state === "open" ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.12)",
                          color: issue.state === "open" ? "var(--success)" : "var(--danger-text)",
                          border: issue.state === "open" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(248,113,113,0.2)",
                        }}>
                          {issue.state}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {repos.length === 0 && users.length === 0 && issues.length === 0 && (
              <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                <Search size={32} style={{ marginBottom: 12, opacity: 0.25, display: "block", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No results found for &ldquo;{q}&rdquo;</p>
                <p style={{ fontSize: 13 }}>Try a different search term.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
