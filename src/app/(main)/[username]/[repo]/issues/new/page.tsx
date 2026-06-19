"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function NewIssuePage() {
  const router = useRouter();
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo } = params;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/repos/${username}/${repo}/labels`)
      .then((r) => r.json())
      .then((d) => setLabels(d.labels || []));
  }, [username, repo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, labelIds: selectedLabels }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create issue"); return; }
      router.push(`/${username}/${repo}/issues/${data.issue.number}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>New issue</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid #f85149", borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13 }}>
              {error}
            </div>
          )}
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              required
              style={{ width: "100%", fontSize: 15, fontWeight: 600 }}
            />
          </div>
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave a comment"
              rows={12}
              style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting…" : "Submit new issue"}
            </button>
            <Link href={`/${username}/${repo}/issues`} className="btn">Cancel</Link>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {labels.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Labels
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {labels.map((l) => (
                  <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={selectedLabels.includes(l.id)}
                      onChange={(e) =>
                        setSelectedLabels((prev) =>
                          e.target.checked ? [...prev, l.id] : prev.filter((id) => id !== l.id)
                        )
                      }
                      style={{ width: "auto" }}
                    />
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
