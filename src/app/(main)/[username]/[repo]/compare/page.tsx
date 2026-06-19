"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, GitCommitHorizontal, GitPullRequestArrow } from "lucide-react";

interface Commit {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

interface CompareResult {
  commits: Commit[];
  stat: string;
  base: string;
  head: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function parseStatSummary(stat: string): { commits: number; files: number } | null {
  if (!stat) return null;
  // Last line of git diff --stat looks like: " 3 files changed, 10 insertions(+), 2 deletions(-)"
  const lines = stat.trim().split("\n");
  const summary = lines[lines.length - 1];
  const filesMatch = summary.match(/(\d+) file/);
  return { commits: 0, files: filesMatch ? parseInt(filesMatch[1]) : 0 };
}

export default function ComparePage() {
  const params = useParams();
  const username = params.username as string;
  const repoName = params.repo as string;

  const [base, setBase] = useState("main");
  const [head, setHead] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (!base.trim() || !head.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `/api/repos/${username}/${repoName}/compare?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Compare failed"); return; }
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const statSummary = result ? parseStatSummary(result.stat) : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <ArrowLeftRight size={18} color="var(--accent)" />
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Compare branches</h2>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleCompare} style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Base</label>
            <input
              required
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="main"
              className="input"
              style={{ fontSize: 13, padding: "6px 10px", minWidth: 160 }}
            />
          </div>

          <div style={{ color: "var(--text-muted)", paddingBottom: 4 }}>
            <ArrowLeftRight size={16} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Head (compare)</label>
            <input
              required
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder="feature/my-branch"
              className="input"
              style={{ fontSize: 13, padding: "6px 10px", minWidth: 200 }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-sm"
            disabled={loading}
            style={{ background: "var(--accent)", color: "#fff", alignSelf: "flex-end" }}
          >
            {loading ? "Comparing…" : "Compare"}
          </button>
        </form>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {result && (
        <>
          {/* Summary bar */}
          <div className="card" style={{ padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
              <span>
                <strong>{result.commits.length}</strong>{" "}
                <span style={{ color: "var(--text-muted)" }}>commit{result.commits.length !== 1 ? "s" : ""}</span>
              </span>
              {statSummary && statSummary.files > 0 && (
                <span>
                  <strong>{statSummary.files}</strong>{" "}
                  <span style={{ color: "var(--text-muted)" }}>file{statSummary.files !== 1 ? "s" : ""} changed</span>
                </span>
              )}
              <code style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-secondary)", borderRadius: 4, padding: "2px 8px" }}>
                {result.base} → {result.head}
              </code>
            </div>

            {result.commits.length > 0 && (
              <Link
                href={`/${username}/${repoName}/pulls/new?base=${encodeURIComponent(result.base)}&head=${encodeURIComponent(result.head)}`}
                className="btn btn-sm"
                style={{ background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                <GitPullRequestArrow size={13} /> Create Pull Request
              </Link>
            )}
          </div>

          {result.commits.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ fontSize: 14 }}>No commits between <strong>{result.base}</strong> and <strong>{result.head}</strong>.</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "10px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                Commits
              </div>
              {result.commits.map((commit, i) => (
                <div
                  key={commit.sha}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < result.commits.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <GitCommitHorizontal size={16} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{commit.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <span style={{ fontWeight: 600 }}>{commit.author}</span>
                      <span style={{ marginLeft: 8 }}>{timeAgo(commit.date)}</span>
                    </div>
                  </div>
                  <code style={{
                    fontSize: 11, fontFamily: "monospace", flexShrink: 0,
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    borderRadius: 4, padding: "1px 6px", color: "var(--text-muted)",
                  }}>
                    {commit.shortSha}
                  </code>
                </div>
              ))}
            </div>
          )}

          {/* Diff stat */}
          {result.stat && (
            <div className="card" style={{ padding: 16, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Diff stat</div>
              <pre style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: 12, margin: 0, whiteSpace: "pre-wrap", color: "var(--text)" }}>
                {result.stat}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
