"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, XCircle, RotateCcw } from "lucide-react";

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

  async function act(action: string) {
    setLoading(action);
    setError("");
    setProtectionError(null);
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/pulls/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isOwner && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => act("merge")}
            disabled={!!loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading === "merge" ? (
              <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
            ) : <GitMerge size={13} />}
            Merge pull request
          </button>
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
