"use client";
import { useState } from "react";
import { Sparkles, Loader, ChevronDown, ChevronUp } from "lucide-react";
import Markdown from "@/components/ui/Markdown";

export default function AIReviewPanel({
  owner, repo, prNumber,
}: { owner: string; repo: string; prNumber: number }) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}/ai-review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReview(data.review);
    } catch (e: any) {
      setError(e.message || "Failed to generate review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 14px",
          background: "linear-gradient(90deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))",
          borderBottom: review ? "1px solid var(--border)" : "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => review && setOpen(!open)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={15} color="#a78bfa" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>AI Code Review</span>
          {review && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(167,139,250,0.15)", padding: "1px 6px", borderRadius: 10 }}>by Claude</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!review && (
            <button
              onClick={(e) => { e.stopPropagation(); generate(); }}
              disabled={loading}
              style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 6,
                background: loading ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.2)",
                border: "1px solid rgba(167,139,250,0.4)",
                color: "#a78bfa", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {loading ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={11} />}
              {loading ? "Reviewing…" : "Generate review"}
            </button>
          )}
          {review && (open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />)}
        </div>
      </div>
      {review && open && (
        <div style={{ padding: "14px 16px" }}>
          <Markdown content={review} />
        </div>
      )}
      {error && <div style={{ padding: "10px 14px", fontSize: 12, color: "#f85149" }}>{error}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
