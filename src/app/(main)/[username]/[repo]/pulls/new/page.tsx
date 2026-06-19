"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { GitPullRequest, ArrowLeft, GitBranch } from "lucide-react";

export default function NewPullRequestPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const repoName = params.repo as string;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [headBranch, setHeadBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [isDraft, setIsDraft] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/repos/${username}/${repoName}/branches`)
      .then(r => r.json())
      .then(d => {
        const names: string[] = (d.branches ?? []).map((b: any) => b.name as string);
        setBranches(names);
        if (names.length > 0) {
          setBaseBranch(names[0]);
          setHeadBranch(names[1] ?? names[0]);
        }
      });
  }, [username, repoName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (headBranch === baseBranch) { setError("Head and base branch must differ"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${username}/${repoName}/pulls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, headBranch, baseBranch, isDraft }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create PR"); return; }
      router.push(`/${username}/${repoName}/pulls/${data.pull.number}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/${username}/${repoName}/pulls`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-muted)", marginBottom: 12,
        }}>
          <ArrowLeft size={13} /> Back to pull requests
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <GitPullRequest size={22} color="#22c55e" />
          Open a pull request
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          Comparing changes in <strong>{username}/{repoName}</strong>
        </p>
      </div>

      {branches.length < 2 && (
        <div style={{
          background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)",
          borderRadius: 8, padding: "14px 18px", color: "var(--text-muted)", fontSize: 14,
        }}>
          You need at least 2 branches to open a pull request.
        </div>
      )}

      {branches.length >= 2 && <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8, padding: "10px 16px", color: "var(--danger-text)", fontSize: 13,
          }}>{error}</div>
        )}

        {/* Branch selector */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <GitBranch size={16} color="var(--text-muted)" />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>base:</label>
              <select
                value={baseBranch}
                onChange={e => setBaseBranch(e.target.value)}
                style={{ width: 160 }}
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>←</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>compare:</label>
              <select
                value={headBranch}
                onChange={e => setHeadBranch(e.target.value)}
                style={{ width: 160 }}
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* PR form */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 7, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Add a descriptive title…"
              required
              style={{ fontSize: 15, fontWeight: 500 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 7, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Description
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe your changes, link issues with #number, add screenshots…"
              rows={8}
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={isDraft}
              onChange={e => setIsDraft(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: 13 }}>
              <strong>Draft pull request</strong>
              <span style={{ color: "var(--text-muted)" }}> — not ready for review yet</span>
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Link href={`/${username}/${repoName}/pulls`} className="btn">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ minWidth: 140, justifyContent: "center" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 12, height: 12,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite", display: "inline-block",
                }} />
                Creating…
              </span>
            ) : isDraft ? "Create draft PR" : "Create pull request"}
          </button>
        </div>
      </form>}
    </div>
  );
}
