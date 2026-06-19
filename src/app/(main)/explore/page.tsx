import type { Metadata } from "next";
import Link from "next/link";
import { Star, GitFork, Lock, Search } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { timeAgo, getLanguageColor, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };

const TOPICS = ["typescript", "go", "python", "react", "kubernetes", "devops", "machine-learning", "api", "self-hosted", "ci-cd"];
const SORTS = ["Trending", "Most Starred", "Recently Updated", "Most Forked"] as const;
type Sort = typeof SORTS[number];

type SearchParams = Promise<{ topic?: string; sort?: string; q?: string }>;

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { topic, sort = "Trending", q } = await searchParams;

  const orderBy: Record<Sort, object> = {
    "Trending":         { stars: { _count: "desc" } },
    "Most Starred":     { stars: { _count: "desc" } },
    "Recently Updated": { updatedAt: "desc" },
    "Most Forked":      { updatedAt: "desc" },
  };

  const where: Record<string, unknown> = { isPrivate: false };
  if (topic) {
    where.topics = { contains: topic };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const repos = await db.repository.findMany({
    where,
    orderBy: orderBy[sort as Sort] ?? { updatedAt: "desc" },
    take: 24,
    include: {
      owner: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { stars: true } },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{
          fontSize: 30, fontWeight: 800, marginBottom: 8,
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, var(--text), var(--text-muted))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Explore GitCode
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Discover repositories and topics.
        </p>
        <form method="GET" action="/explore" style={{ maxWidth: 480, margin: "20px auto 0", position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)", pointerEvents: "none" }} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search public repositories…"
            style={{ width: "100%", paddingLeft: 40, paddingRight: 16, fontSize: 14 }}
          />
        </form>
      </div>

      {/* Topic pills */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 24 }}>
        <Link
          href="/explore"
          style={{
            fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
            background: !topic ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: !topic ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
            color: !topic ? "var(--accent-hover)" : "var(--text-muted)",
            textDecoration: "none",
          }}
        >All</Link>
        {TOPICS.map((t) => (
          <Link key={t} href={`/explore?topic=${t}`} style={{
            fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
            background: topic === t ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: topic === t ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
            color: topic === t ? "var(--accent-hover)" : "var(--text-muted)",
            textDecoration: "none",
            transition: "all 0.15s",
          }}>
            #{t}
          </Link>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {SORTS.map((tab) => (
          <Link
            key={tab}
            href={`/explore?${topic ? `topic=${topic}&` : ""}sort=${encodeURIComponent(tab)}`}
            className={`tab ${sort === tab ? "active" : ""}`}
          >{tab}</Link>
        ))}
      </div>

      {/* Repo grid */}
      {repos.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Search size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No public repositories found{q ? ` for "${q}"` : ""}.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {repos.map((repo: any, i: number) => {
            const topics: string[] = (() => { try { return JSON.parse(repo.topics || "[]"); } catch { return []; } })();
            return (
              <div key={repo.id} className="card card-hover" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, animation: `fadeIn 0.2s ${i * 0.03}s ease both` }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <img
                      src={repo.owner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner.username}`}
                      alt=""
                      style={{ width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <Link href={`/${repo.owner.username}`} style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                      {repo.owner.username}
                    </Link>
                    {repo.isPrivate && <Lock size={11} color="var(--text-subtle)" />}
                  </div>
                  <Link href={`/${repo.owner.username}/${repo.name}`} style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                    {repo.name}
                  </Link>
                  {repo.description && (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {repo.description}
                    </p>
                  )}
                </div>

                {topics.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {topics.slice(0, 4).map((t: string) => (
                      <Link key={t} href={`/explore?topic=${t}`} style={{
                        background: "var(--accent-subtle)", color: "var(--accent-hover)",
                        borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 500,
                        textDecoration: "none",
                      }}>{t}</Link>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
                  {repo.language && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: getLanguageColor(repo.language), flexShrink: 0 }} />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    <Star size={12} /> {formatNumber(repo._count.stars)}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-subtle)" }}>
                    {timeAgo(repo.updatedAt.toISOString())}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
