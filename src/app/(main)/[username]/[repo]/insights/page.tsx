"use client";
import { useState, useEffect } from "react";
import { GitCommit, Star, GitFork, CircleDot, GitPullRequestArrow, Workflow } from "lucide-react";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f0db4f", Python: "#3572A5",
  Go: "#00ADD8", Rust: "#dea584", Ruby: "#CC342D", Java: "#b07219",
  "C#": "#178600", "C++": "#f34b7d", C: "#555555", Swift: "#F05138",
  Kotlin: "#A97BFF", PHP: "#4F5D95", HTML: "#e34c26", CSS: "#563d7c",
  SCSS: "#c6538c", Shell: "#89e051", SQL: "#e38c00",
};

export default function InsightsPage({ params }: { params: Promise<{ username: string; repo: string }> }) {
  const [username, setUsername] = useState("");
  const [repo, setRepo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ username: u, repo: r }) => {
      setUsername(u);
      setRepo(r);
      fetch(`/api/repos/${u}/${r}/insights`)
        .then(res => res.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [params]);

  // Build 52-week commit chart
  function buildWeeks(commitsByDate: Record<string, number>) {
    const weeks: { label: string; count: number }[] = [];
    const now = new Date();
    for (let w = 51; w >= 0; w--) {
      let count = 0;
      let label = "";
      for (let d = 0; d < 7; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - w * 7 - d);
        const key = date.toISOString().split("T")[0];
        count += commitsByDate[key] || 0;
        if (d === 0) label = date.toLocaleString("default", { month: "short" });
      }
      weeks.push({ label, count });
    }
    return weeks;
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading insights…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Failed to load insights.</div>;

  const weeks = buildWeeks(data.commitsByDate || {});
  const maxCommits = Math.max(...weeks.map(w => w.count), 1);
  const maxContrib = Math.max(...(data.contributors || []).map((c: any) => c.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { icon: <Star size={16} color="#f59e0b" />, label: "Stars", value: data.stats.stars },
          { icon: <GitFork size={16} color="#60a5fa" />, label: "Forks", value: data.stats.forks },
          { icon: <CircleDot size={16} color="#22c55e" />, label: "Issues", value: data.stats.issues },
          { icon: <GitPullRequestArrow size={16} color="#a78bfa" />, label: "Pull Requests", value: data.stats.prs },
          { icon: <Workflow size={16} color="#f472b6" />, label: "Pipelines", value: data.stats.pipelines },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Commit activity */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Commit activity (last 52 weeks)</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
          {weeks.map((w, i) => (
            <div key={i} title={`${w.count} commits`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <div style={{
                width: "100%", borderRadius: 2,
                background: w.count > 0 ? "#39d353" : "rgba(255,255,255,0.05)",
                height: `${Math.max(w.count / maxCommits * 100, w.count > 0 ? 4 : 2)}%`,
                transition: "height 0.3s",
                opacity: w.count > 0 ? 0.6 + (w.count / maxCommits * 0.4) : 1,
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
          {weeks.map((w, i) => (
            <div key={i} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", textAlign: "center", overflow: "hidden" }}>
              {i % 4 === 0 ? w.label : ""}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Languages */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Languages</h3>
          {data.languages.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No files detected</p>
          ) : (
            <>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
                {data.languages.map((l: any) => (
                  <div key={l.name} style={{ width: `${l.pct}%`, background: LANG_COLORS[l.name] || "#6e7681" }} title={`${l.name} ${l.pct}%`} />
                ))}
              </div>
              {data.languages.slice(0, 8).map((l: any) => (
                <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: LANG_COLORS[l.name] || "#6e7681", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1 }}>{l.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.pct}%</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Contributors */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Top contributors</h3>
          {data.contributors.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No commits yet</p>
          ) : (
            data.contributors.slice(0, 8).map((c: any, i: number) => (
              <div key={c.email} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.count} commits</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                  <div style={{ height: "100%", background: "#39d353", borderRadius: 2, width: `${c.count / maxContrib * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
