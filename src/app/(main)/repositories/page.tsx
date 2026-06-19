import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Plus, Star } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLanguageColor, formatNumber, timeAgo } from "@/lib/utils";
import StarButton from "@/components/repo/StarButton";

export const metadata: Metadata = { title: "Repositories" };

export default async function RepositoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [repos, userStars] = await Promise.all([
    db.repository.findMany({
      where: { ownerId: session.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { username: true, name: true, avatarUrl: true } },
        _count: { select: { stars: true, issues: true } },
      },
    }),
    db.star.findMany({
      where: { userId: session.userId },
      select: { repoId: true },
    }),
  ]);
  const starredIds = new Set(userStars.map((s: any) => s.repoId));

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Repositories</h1>
        <Link href="/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> New repository
        </Link>
      </div>

      {repos.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>You don&apos;t have any repositories yet.</p>
          <Link href="/new" className="btn btn-primary">Create your first repository</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {repos.map((repo: any, i: number) => (
            <div key={repo.id} style={{ padding: "20px 0", borderBottom: i < repos.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: 20, alignItems: "flex-start" }}>
              <img
                src={repo.owner.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${repo.owner.username}`}
                alt=""
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <Link href={`/${repo.owner.username}/${repo.name}`} style={{ fontWeight: 700, fontSize: 17 }}>
                    {repo.owner.username}/{repo.name}
                  </Link>
                  {repo.isPrivate && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "1px 8px" }}>
                      <Lock size={10} /> Private
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                    {repo.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {repo.language && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: getLanguageColor(repo.language) }} />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    <Star size={12} /> {formatNumber(repo._count.stars)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Updated {timeAgo(repo.updatedAt.toISOString())}
                  </span>
                  {repo.license && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>⚖️ {repo.license}</span>
                  )}
                </div>
              </div>
              <StarButton
                username={repo.owner.username}
                repo={repo.name}
                initialCount={repo._count.stars}
                initialStarred={starredIds.has(repo.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
