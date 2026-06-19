"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

export default function RepoSettingsPage() {
  const router = useRouter();
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoName } = params;

  const [form, setForm] = useState({ description: "", isPrivate: false, defaultBranch: "main" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    fetch(`/api/repos/${username}/${repoName}`)
      .then(r => r.json())
      .then(d => {
        if (d.repo) setForm({ description: d.repo.description ?? "", isPrivate: d.repo.isPrivate, defaultBranch: d.repo.defaultBranch });
      });
  }, [username, repoName]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch(`/api/repos/${username}/${repoName}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); router.refresh(); }
    else { const d = await res.json(); setError(d.error || "Save failed"); }
  }

  async function deleteRepo() {
    if (deleteConfirm !== repoName) return;
    const res = await fetch(`/api/repos/${username}/${repoName}`, { method: "DELETE" });
    if (res.ok) router.push("/repositories");
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Repository settings</h2>

      <form onSubmit={save} className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>General</h3>
        {error && <div style={{ color: "#f85149", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: "100%" }} placeholder="Short description" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))} />
            <span style={{ fontWeight: 600 }}>Private repository</span>
          </label>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginLeft: 20 }}>Only you can see this repository.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
          {saved && <span style={{ color: "#3fb950", fontSize: 13 }}>✓ Saved</span>}
        </div>
      </form>

      {/* Danger Zone */}
      <div className="card" style={{ padding: 24, border: "1px solid #f85149" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#f85149", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} /> Danger Zone
        </h3>
        <div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Type <strong>{repoName}</strong> to confirm deletion. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={repoName}
              style={{ flex: 1 }}
            />
            <button
              onClick={deleteRepo}
              disabled={deleteConfirm !== repoName}
              style={{ background: "#f85149", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: deleteConfirm === repoName ? "pointer" : "not-allowed", opacity: deleteConfirm === repoName ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}
            >
              <Trash2 size={13} /> Delete repository
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
