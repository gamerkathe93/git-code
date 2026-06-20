"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/ui/Markdown";

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
  const [preview, setPreview] = useState(false);

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
      setPreview(false);
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

      {/* Write / Preview tab toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={() => setPreview(false)}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: preview ? 400 : 600,
            background: "none",
            border: "none",
            borderBottom: preview ? "2px solid transparent" : "2px solid var(--accent)",
            color: preview ? "var(--text-muted)" : "var(--text)",
            cursor: "pointer",
            marginBottom: -1,
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: preview ? 600 : 400,
            background: "none",
            border: "none",
            borderBottom: preview ? "2px solid var(--accent)" : "2px solid transparent",
            color: preview ? "var(--text)" : "var(--text-muted)",
            cursor: "pointer",
            marginBottom: -1,
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          Preview
        </button>
      </div>

      {preview ? (
        <div
          style={{
            minHeight: 120,
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 12,
            marginBottom: 12,
            background: "var(--bg-secondary)",
          }}
        >
          {body.trim() ? (
            <Markdown content={body} />
          ) : (
            <span style={{ color: "var(--text-subtle)", fontSize: 13, fontStyle: "italic" }}>Nothing to preview.</span>
          )}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment (Markdown supported)"
          rows={6}
          style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 13, marginBottom: 12 }}
        />
      )}

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
