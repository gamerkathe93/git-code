"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  username: string;
  repo: string;
  issueNumber: number;
  issueState: string;
  isAuthor: boolean;
}

export default function IssueCommentForm({ username, repo, issueNumber, issueState, isAuthor }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitComment(close = false) {
    if (!body.trim() && !close) return;
    setLoading(true);
    try {
      setError("");
      if (body.trim()) {
        const res = await fetch(`/api/repos/${username}/${repo}/issues/${issueNumber}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to post comment"); return; }
      }
      if (close) {
        const res = await fetch(`/api/repos/${username}/${repo}/issues/${issueNumber}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: issueState === "open" ? "closed" : "open" }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to update issue"); return; }
      }
      setBody("");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      {error && (
        <div style={{ color: "#f85149", fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "rgba(248,81,73,0.1)", borderRadius: 4, border: "1px solid #f8514944" }}>{error}</div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a comment"
        rows={6}
        style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 13, marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {isAuthor && (
          <button
            className="btn"
            onClick={() => submitComment(true)}
            disabled={loading}
            style={{ fontSize: 13 }}
          >
            {issueState === "open" ? "Close issue" : "Reopen issue"}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => submitComment(false)}
          disabled={loading || !body.trim()}
          style={{ fontSize: 13 }}
        >
          {loading ? "Submitting…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
