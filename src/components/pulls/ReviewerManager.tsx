"use client";

import { useState } from "react";
import { Plus, X, CheckCircle, XCircle, Clock } from "lucide-react";

export interface ReviewerWithUser {
  id: string;
  pullRequestId: string;
  reviewerId: string;
  state: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  reviewer: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface Props {
  reviewers: ReviewerWithUser[];
  pullNumber: number;
  owner: string;
  repo: string;
  isOwner: boolean;
  currentUserId?: string;
}

function StateBadge({ state }: { state: string }) {
  if (state === "approved") {
    return (
      <span style={{ fontSize: 11, color: "#3fb950", display: "inline-flex", alignItems: "center", gap: 2 }}>
        <CheckCircle size={11} /> Approved
      </span>
    );
  }
  if (state === "changes_requested") {
    return (
      <span style={{ fontSize: 11, color: "#f85149", display: "inline-flex", alignItems: "center", gap: 2 }}>
        <XCircle size={11} /> Changes requested
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 2 }}>
      <Clock size={11} /> Awaiting
    </span>
  );
}

export default function ReviewerManager({ reviewers: initialReviewers, pullNumber, owner, repo, isOwner, currentUserId }: Props) {
  const [reviewers, setReviewers] = useState<ReviewerWithUser[]>(initialReviewers);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/repos/${owner}/${repo}/pulls/${pullNumber}/reviewers`;

  const isCurrentUserReviewer = currentUserId
    ? reviewers.some((r) => r.reviewerId === currentUserId)
    : false;

  async function handleAdd() {
    if (!addInput.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addInput.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Failed to add reviewer");
        return;
      }
      setReviewers((prev) => {
        const exists = prev.find((r) => r.id === j.reviewer.id);
        if (exists) return prev.map((r) => (r.id === j.reviewer.id ? j.reviewer : r));
        return [...prev, j.reviewer];
      });
      setAddInput("");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(username: string) {
    setError(null);
    try {
      const res = await fetch(baseUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to remove reviewer");
        return;
      }
      setReviewers((prev) => prev.filter((r) => r.reviewer.username !== username));
    } catch {
      setError("Failed to remove reviewer");
    }
  }

  async function handleSubmitReview(state: "approved" | "changes_requested") {
    setError(null);
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Failed to submit review");
        return;
      }
      setReviewers((prev) =>
        prev.map((r) => (r.reviewerId === currentUserId ? { ...r, state } : r))
      );
    } catch {
      setError("Failed to submit review");
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Reviewers
      </h3>

      {reviewers.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>No reviewers</span>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: isOwner ? 8 : 0 }}>
        {reviewers.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {r.reviewer.avatarUrl ? (
                <img src={r.reviewer.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.reviewer.username}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <span style={{ fontSize: 13, flex: 1 }}>{r.reviewer.username}</span>
            <StateBadge state={r.state} />
            {isOwner && (
              <button
                onClick={() => handleRemove(r.reviewer.username)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex", alignItems: "center" }}
                title="Remove reviewer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input
            className="input"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="Add reviewer by username"
            style={{ flex: 1, fontSize: 12, padding: "4px 8px" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            className="btn btn-sm"
            onClick={handleAdd}
            disabled={adding || !addInput.trim()}
            title="Add reviewer"
          >
            <Plus size={12} />
          </button>
        </div>
      )}

      {isCurrentUserReviewer && (
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <button
            className="btn btn-sm"
            style={{ fontSize: 11, flex: 1 }}
            onClick={() => handleSubmitReview("approved")}
          >
            <CheckCircle size={11} /> Approve
          </button>
          <button
            className="btn btn-sm"
            style={{ fontSize: 11, flex: 1, color: "#f85149" }}
            onClick={() => handleSubmitReview("changes_requested")}
          >
            <XCircle size={11} /> Request changes
          </button>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "#f85149", marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
