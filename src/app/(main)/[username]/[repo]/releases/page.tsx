import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, PackageOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Releases" };

type Params = { params: Promise<{ username: string; repo: string }> };

export default async function ReleasesPage({ params }: Params) {
  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const releases = await db.release.findMany({
    where: { repoId: repo.id },
    include: { author: { select: { username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Releases ({releases.length})</h2>
        <Link href="#" className="btn btn-primary btn-sm">
          <Plus size={14} /> New release
        </Link>
      </div>

      {releases.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <PackageOpen size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>No releases yet.</p>
          <Link href="#" className="btn btn-primary btn-sm"><Plus size={13} /> Create first release</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {releases.map((release, i) => (
            <div key={release.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 32, marginBottom: 32 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ textAlign: "right", minWidth: 100, paddingTop: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {release.isDraft ? "Draft" : formatDate(release.createdAt.toISOString())}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                      {release.name || release.tagName}
                    </span>
                    {release.isPrerelease && (
                      <span className="badge badge-pending">Pre-release</span>
                    )}
                    {release.isDraft && (
                      <span className="badge badge-draft">Draft</span>
                    )}
                    {i === 0 && !release.isPrerelease && !release.isDraft && (
                      <span className="badge badge-success">Latest</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                      <Package size={13} />
                      <span style={{ fontFamily: "monospace", color: "var(--accent-hover)" }}>{release.tagName}</span>
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      Released by{" "}
                      <Link href={`/${release.author.username}`} style={{ color: "var(--accent)" }}>
                        {release.author.name || release.author.username}
                      </Link>
                    </span>
                  </div>

                  {release.body && (
                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 20px" }}>
                      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, color: "var(--text)", margin: 0 }}>
                        {release.body.length > 500 ? release.body.slice(0, 500) + "…" : release.body}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
