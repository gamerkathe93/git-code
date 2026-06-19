import type { Metadata } from "next";
import Link from "next/link";
import { Tag, Download, Plus, GitBranch } from "lucide-react";
import { RELEASES } from "@/lib/mock-data";
import { timeAgo, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Releases" };

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function ReleasesPage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Releases ({RELEASES.length})</h2>
        <Link href="#" className="btn btn-primary btn-sm">
          <Plus size={14} /> New release
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {RELEASES.map((release, i) => (
          <div key={release.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 32, marginBottom: 32 }}>
            {/* Header */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ textAlign: "right", minWidth: 100, paddingTop: 4 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {release.publishedAt ? formatDate(release.publishedAt) : "Draft"}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <Link href={`#release-${release.id}`} style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                    {release.name}
                  </Link>
                  {release.isPreRelease && (
                    <span className="badge badge-pending">Pre-release</span>
                  )}
                  {release.isDraft && (
                    <span className="badge badge-draft">Draft</span>
                  )}
                  {i === 0 && !release.isPreRelease && !release.isDraft && (
                    <span className="badge badge-success">Latest</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                    <Tag size={13} />
                    <Link href="#" style={{ fontFamily: "monospace", color: "var(--accent-hover)" }}>{release.tagName}</Link>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                    <GitBranch size={13} /> {release.targetCommitish}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Released by <Link href={`/${release.author.username}`}>{release.author.name}</Link>
                  </span>
                </div>

                {/* Body */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 20px", marginBottom: 16 }}>
                  <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, color: "var(--text)", margin: 0 }}>
                    {release.body}
                  </pre>
                </div>

                {/* Assets */}
                {release.assets.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Download size={14} /> Assets ({release.assets.length})
                    </div>
                    <div className="card">
                      {release.assets.map((asset, j) => (
                        <Link key={asset.id} href={asset.url} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: j < release.assets.length - 1 ? "1px solid var(--border-muted)" : "none", textDecoration: "none", color: "var(--text)" }}>
                          <Download size={14} color="var(--text-muted)" />
                          <span style={{ flex: 1, fontSize: 13 }}>{asset.name}</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatBytes(asset.size)}</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{asset.downloadCount.toLocaleString()} downloads</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
