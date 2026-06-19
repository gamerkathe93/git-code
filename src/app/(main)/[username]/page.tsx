import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { MapPin, Link2, Building2, Star, GitFork, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLanguageColor, timeAgo, formatNumber } from "@/lib/utils";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: username };
}

export default async function UserProfilePage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    include: {
      _count: { select: { repositories: true, stars: true } },
    },
  });
  if (!user) notFound();

  const repos = await db.repository.findMany({
    where: {
      ownerId: user.id,
      ...(session.username !== username ? { isPrivate: false } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { _count: { select: { stars: true } } },
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32 }}>
        {/* Left: Profile card */}
        <div>
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={user.username}
            style={{ width: "100%", borderRadius: "50%", border: "3px solid var(--border)", marginBottom: 16 }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{user.name}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 16, marginBottom: 12 }}>@{user.username}</div>
          {user.bio && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{user.bio}</p>}

          {session.username === username && (
            <Link href="/settings/profile" className="btn" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}>
              Edit profile
            </Link>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {user.company && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                <Building2 size={14} /> {user.company}
              </div>
            )}
            {user.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                <MapPin size={14} /> {user.location}
              </div>
            )}
            {user.website && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <Link2 size={14} color="var(--text-muted)" />
                <a href={user.website} target="_blank" rel="noopener noreferrer">{user.website.replace(/^https?:\/\//, "")}</a>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 13 }}>
            <span><strong>{user._count.repositories}</strong> <span style={{ color: "var(--text-muted)" }}>repositories</span></span>
            <span><strong>{user._count.stars}</strong> <span style={{ color: "var(--text-muted)" }}>stars</span></span>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
            Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Right: Repos */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Repositories</h2>
            <Link href={`/${username}?tab=repos`} style={{ fontSize: 12, color: "var(--accent)" }}>
              View all ({user._count.repositories})
            </Link>
          </div>
          {repos.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              No public repositories yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {repos.map((repo: any) => (
                <div key={repo.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Link href={`/${username}/${repo.name}`} style={{ fontWeight: 600, fontSize: 14 }}>
                      {repo.name}
                    </Link>
                    {repo.isPrivate && <Lock size={12} color="var(--text-muted)" />}
                  </div>
                  {repo.description && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                      {repo.description.slice(0, 80)}{repo.description.length > 80 ? "…" : ""}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12 }}>
                    {repo.language && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: getLanguageColor(repo.language) }} />
                        {repo.language}
                      </span>
                    )}
                    {repo._count.stars > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)" }}>
                        <Star size={11} /> {formatNumber(repo._count.stars)}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(repo.updatedAt.toISOString())}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
