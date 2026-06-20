"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, FileCode2, GitCommit, CircleDot } from "lucide-react";

function SearchContent({ username, repo }: { username: string; repo: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [type, setType] = useState(searchParams.get("type") || "code");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, searchType: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await fetch(`/api/repos/${username}/${repo}/search?q=${encodeURIComponent(query)}&type=${searchType}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }, [username, repo]);

  useEffect(() => {
    const timer = setTimeout(() => { if (q) search(q, type); else setResults([]); }, 300);
    return () => clearTimeout(timer);
  }, [q, type, search]);

  const tabs = [
    { id: "code", label: "Code", icon: <FileCode2 size={13} /> },
    { id: "commits", label: "Commits", icon: <GitCommit size={13} /> },
    { id: "issues", label: "Issues", icon: <CircleDot size={13} /> },
  ];

  return (
    <div>
      {/* Search input */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search in ${username}/${repo}…`}
            style={{ width: "100%", padding: "10px 12px 10px 36px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", fontSize: 13,
            background: "none", border: "none", cursor: "pointer",
            borderBottom: type === t.id ? "2px solid var(--accent)" : "2px solid transparent",
            color: type === t.id ? "var(--text)" : "var(--text-muted)",
            marginBottom: -1,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Searching…</div>}
      {!loading && q && results.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No results for "{q}"</div>
      )}
      {!loading && type === "code" && results.map((r: any, i: number) => (
        <div key={i} className="card" style={{ padding: 0, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <Link href={`/${username}/${repo}/blob/HEAD/${r.file}`} style={{ fontSize: 13, color: "var(--accent)" }}>
              {r.file}
            </Link>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>line {r.line}</span>
          </div>
          <pre style={{ margin: 0, padding: "10px 12px", fontSize: 12, fontFamily: "monospace", overflowX: "auto", lineHeight: 1.6 }}>
            <span style={{ color: "var(--text-muted)", marginRight: 16, userSelect: "none" }}>{r.line}</span>
            {r.content}
          </pre>
        </div>
      ))}
      {!loading && type === "commits" && results.map((r: any) => (
        <div key={r.sha} className="card" style={{ padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
          <code style={{ fontSize: 12, color: "var(--accent)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>{r.sha}</code>
          <Link href={`/${username}/${repo}/commits/${r.sha}`} style={{ fontSize: 13 }}>{r.message}</Link>
        </div>
      ))}
      {!loading && type === "issues" && results.map((r: any) => (
        <div key={r.id} className="card" style={{ padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
          <CircleDot size={14} color={r.state === "open" ? "#22c55e" : "#f87171"} />
          <Link href={`/${username}/${repo}/issues/${r.number}`} style={{ fontSize: 13 }}>
            {r.title} <span style={{ color: "var(--text-muted)" }}>#{r.number}</span>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage({ params }: { params: Promise<{ username: string; repo: string }> }) {
  const [p, setP] = useState<{ username: string; repo: string } | null>(null);
  useEffect(() => { params.then(setP); }, [params]);
  if (!p) return null;
  return (
    <Suspense>
      <SearchContent username={p.username} repo={p.repo} />
    </Suspense>
  );
}
