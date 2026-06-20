"use client";
import { useState } from "react";
import { Sparkles, Loader } from "lucide-react";

interface TriageResult {
  labels: string[];
  priority: string;
  summary: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#f85149",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3fb950",
};

export default function AITriagePanel({
  owner, repo, issueId,
}: { owner: string; repo: string; issueId: string }) {
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function triage() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${owner}/${repo}/issues/ai-triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Triage failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: result ? 10 : 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
          <Sparkles size={11} color="#a78bfa" /> AI Triage
        </span>
        {!result && (
          <button
            onClick={triage}
            disabled={loading}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            {loading ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={10} />}
            {loading ? "Triaging…" : "Triage"}
          </button>
        )}
      </div>
      {result && (
        <div style={{ fontSize: 12 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 8 }}>{result.summary}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", borderRadius: 10, background: `${PRIORITY_COLORS[result.priority]}22`, color: PRIORITY_COLORS[result.priority], border: `1px solid ${PRIORITY_COLORS[result.priority]}44`, fontSize: 11, fontWeight: 600 }}>
              {result.priority} priority
            </span>
            {result.labels.map(l => (
              <span key={l} style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", fontSize: 11 }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
      {error && <p style={{ fontSize: 11, color: "#f85149" }}>{error}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
