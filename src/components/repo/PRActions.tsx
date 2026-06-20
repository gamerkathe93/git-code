"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, XCircle, RotateCcw, ChevronDown, Check } from "lucide-react";

const STRATEGIES = [
  {
    id: "merge",
    label: "Create a merge commit",
    desc: "All commits from the head branch will be added to the base branch via a merge commit.",
  },
  {
    id: "squash",
    label: "Squash and merge",
    desc: "Combine all commits into one before merging.",
  },
  {
    id: "rebase",
    label: "Rebase and merge",
    desc: "Rebase commits onto base branch individually.",
  },
];

export default function PRActions({
  username, repo, number, state, isOwner, isAuthor,
}: {
  username: string; repo: string; number: number;
  state: string; isOwner: boolean; isAuthor: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [protectionError, setProtectionError] = useState<{ message: string; code?: string; required?: number; current?: number } | null>(null);
  const [strategy, setStrategy] = useState("merge");
  const [showStrategyMenu, setShowStrategyMenu] = useState(false);

  async function act(action: string, mergeStrategy?: string) {
    setLoading(action);
    setError("");
    setProtectionError(null);
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/pulls/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "merge" ? { strategy: mergeStrategy ?? strategy } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.code) {
          setProtectionError({ message: data.error, code: data.code, required: data.required, current: data.current });
        } else {
          setError(data.error ?? "Action failed");
        }
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  if (state === "merged") {
    return (
      <div className="card" style={{ padding: 20, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GitMerge size={20} color="#a78bfa" />
          <div>
            <div style={{ fontWeight: 600, color: "#a78bfa" }}>Pull request merged</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Changes have been integrated.</div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <XCircle size={18} color="#f87171" />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>This pull request is closed.</span>
          {(isOwner || isAuthor) && (
            <button
              className="btn btn-sm"
              onClick={() => act("reopen")}
              disabled={!!loading}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}
            >
              <RotateCcw size={12} /> Reopen PR
            </button>
          )}
        </div>
        {error && <p style={{ color: "var(--danger-text)", fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  // open state
  if (!isOwner && !isAuthor) return null;

  return (
    <div className="card" style={{ padding: 20 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Review the changes, then merge or close this pull request.
      </p>
      {protectionError && (
        <div style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.4)", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
          {protectionError.code === "PROTECTION_REQUIRED_APPROVALS" ? (
            <p style={{ fontSize: 13, color: "#d97706", margin: 0 }}>
              ⚠ Requires {protectionError.required} approval(s) — {protectionError.current} given. Request a review to merge.
            </p>
          ) : protectionError.code === "PROTECTION_STATUS_CHECKS" ? (
            <p style={{ fontSize: 13, color: "#d97706", margin: 0 }}>
              ⚠ Required status checks haven&apos;t passed. Pipeline must succeed before merging.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "#d97706", margin: 0 }}>⚠ {protectionError.message}</p>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {isOwner && (
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", borderRadius: 6, overflow: "visible" }}>
              <button
                onClick={() => act("merge")}
                disabled={!!loading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#238636", color: "#fff", border: "none",
                  padding: "6px 14px", fontSize: 13, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  borderRadius: "6px 0 0 6px",
                }}
              >
                {loading === "merge" ? (
                  <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                ) : <GitMerge size={13} />}
                {STRATEGIES.find(s => s.id === strategy)?.label ?? "Create a merge commit"}
              </button>
              <button
                onClick={() => setShowStrategyMenu(prev => !prev)}
                disabled={!!loading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#238636", color: "#fff", border: "none",
                  borderLeft: "1px solid rgba(255,255,255,0.2)",
                  padding: "6px 10px", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  borderRadius: "0 6px 6px 0",
                }}
                aria-label="Select merge strategy"
              >
                <ChevronDown size={13} />
              </button>
            </div>

            {showStrategyMenu && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 4px)", left: 0,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 8, width: 310, zIndex: 50,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                overflow: "hidden",
              }}>
                {STRATEGIES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => { setStrategy(s.id); setShowStrategyMenu(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", background: "none", border: "none",
                      cursor: "pointer",
                      borderBottom: idx < STRATEGIES.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 16, paddingTop: 2, flexShrink: 0 }}>
                        {strategy === s.id && <Check size={14} color="#3fb950" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {(isOwner || isAuthor) && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => act("close")}
            disabled={!!loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading === "close" ? (
              <span style={{ width: 12, height: 12, border: "2px solid rgba(248,113,113,0.3)", borderTopColor: "#f87171", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            ) : <XCircle size={13} />}
            Close PR
          </button>
        )}
      </div>
      {error && <p style={{ color: "var(--danger-text)", fontSize: 12, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
