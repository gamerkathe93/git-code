"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

interface Check {
  label: string;
  score: number;
  max: number;
  passed: boolean;
}

function getColor(score: number) {
  if (score >= 80) return { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Excellent" };
  if (score >= 60) return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Good" };
  if (score >= 40) return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Fair" };
  return { color: "#f85149", bg: "rgba(248,81,73,0.12)", label: "Needs work" };
}

export default function HealthScore({ owner, repo }: { owner: string; repo: string }) {
  const [data, setData] = useState<{ score: number; checks: Check[] } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/repos/${owner}/${repo}/health`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, [owner, repo]);

  if (!data) return null;

  const { color, bg, label } = getColor(data.score);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      {/* Score header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "10px 14px", background: bg, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
      >
        {data.score >= 60
          ? <ShieldCheck size={16} color={color} />
          : <ShieldAlert size={16} color={color} />}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color }}>Health score: {data.score}/100</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>
          </div>
          {/* Score bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${data.score}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
          </div>
        </div>
        {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </div>

      {/* Checks breakdown */}
      {expanded && (
        <div style={{ padding: "8px 14px 12px" }}>
          {data.checks.map(check => (
            <div key={check.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 14 }}>{check.passed ? "✓" : "✗"}</span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--text)" }}>{check.label}</span>
              <span style={{ fontSize: 11, color: check.passed ? "#22c55e" : "var(--text-muted)" }}>
                {check.score}/{check.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
