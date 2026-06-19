"use client";

import { Tag, Download, Trash2, GitCommitHorizontal } from "lucide-react";
import { useState } from "react";

interface TagInfo {
  name: string;
  sha: string;
  author: string;
  date: string;
  message: string;
}

interface Props {
  username: string;
  repoName: string;
  defaultBranch: string;
  isOwner: boolean;
  initialTags: TagInfo[];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function TagsClient({ username, repoName, defaultBranch, isOwner, initialTags }: Props) {
  const [tags, setTags] = useState<TagInfo[]>(initialTags);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", ref: "", message: "" });
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/repos/${username}/${repoName}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), ref: form.ref.trim() || undefined, message: form.message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create tag"); return; }
      // Refresh tags
      const listRes = await fetch(`/api/repos/${username}/${repoName}/tags`);
      const listData = await listRes.json();
      setTags(listData.tags ?? []);
      setForm({ name: "", ref: "", message: "" });
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tagName: string) {
    if (!confirm(`Delete tag "${tagName}"?`)) return;
    try {
      const res = await fetch(`/api/repos/${username}/${repoName}/tags/${encodeURIComponent(tagName)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete tag");
        return;
      }
      setTags((prev) => prev.filter((t) => t.name !== tagName));
    } catch {
      alert("Network error");
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag size={18} color="var(--accent)" />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Tags</h2>
          <span style={{
            fontSize: 13, color: "var(--text-muted)",
            background: "var(--bg-secondary)", borderRadius: 20, padding: "1px 10px",
          }}>
            {tags.length}
          </span>
        </div>
      </div>

      {/* Create tag form — owner only */}
      {isOwner && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Create a new tag</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Tag name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="v1.0.0"
                className="input"
                style={{ fontSize: 13, padding: "6px 10px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Ref (branch/SHA)</label>
              <input
                value={form.ref}
                onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
                placeholder={defaultBranch}
                className="input"
                style={{ fontSize: 13, padding: "6px 10px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Message (annotated tag)</label>
              <input
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Optional release message"
                className="input"
                style={{ fontSize: 13, padding: "6px 10px" }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-sm"
              disabled={creating}
              style={{ background: "var(--accent)", color: "#fff", alignSelf: "flex-end" }}
            >
              <Tag size={12} /> {creating ? "Creating…" : "Create Tag"}
            </button>
          </form>
          {error && <p style={{ color: "var(--danger-text)", fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>
      )}

      {tags.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Tag size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No tags yet. {isOwner ? "Create one above to mark a release point." : ""}</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {tags.map((tag, i) => (
            <div
              key={tag.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 20px",
                borderBottom: i < tags.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <Tag size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--accent)" }}>{tag.name}</span>
                  {tag.sha && (
                    <code style={{
                      fontSize: 11, fontFamily: "monospace",
                      background: "var(--bg-secondary)", border: "1px solid var(--border)",
                      borderRadius: 4, padding: "1px 6px", color: "var(--text-muted)",
                    }}>
                      <GitCommitHorizontal size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                      {tag.sha.slice(0, 7)}
                    </code>
                  )}
                  {tag.message && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{tag.message}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
                  {tag.author && <span>{tag.author}</span>}
                  {tag.date && <span style={{ marginLeft: 8 }}>{timeAgo(tag.date)}</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <a
                  href={`/api/repos/${username}/${repoName}/archive?ref=${encodeURIComponent(tag.name)}&format=zip`}
                  className="btn btn-sm"
                  download
                  style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  <Download size={12} /> ZIP
                </a>

                {isOwner && (
                  <button
                    onClick={() => handleDelete(tag.name)}
                    className="btn btn-sm"
                    style={{ color: "var(--danger-text)", borderColor: "var(--danger)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
