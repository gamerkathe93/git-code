"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Lock, Globe, FileText } from "lucide-react";

export default function CreateRepoForm({ username }: { username: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    defaultBranch: "main",
    initReadme: false,
    license: "",
    gitignore: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name) { setError("Repository name is required"); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.name)) {
      setError("Name can only contain letters, numbers, dots, hyphens, and underscores");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          isPrivate: form.isPrivate,
          defaultBranch: form.defaultBranch,
          initReadme: form.initReadme,
          license: form.license || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create repository");
        return;
      }
      router.push(`/${username}/${form.name}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 700, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Create a new repository</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          A repository contains all project files, including the revision history.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid #f85149", borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
          Owner / Repository name <span style={{ color: "#f85149" }}>*</span>
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ padding: "6px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, color: "var(--text-muted)" }}>
            {username}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 20 }}>/</span>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="my-awesome-project"
            required
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Description (optional)</label>
        <input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Short description of your project"
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Visibility</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="card" style={{ display: "flex", gap: 12, padding: 16, cursor: "pointer", border: `2px solid ${!form.isPrivate ? "var(--accent)" : "var(--border)"}` }}>
            <input type="radio" name="visibility" checked={!form.isPrivate} onChange={() => set("isPrivate", false)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <Globe size={16} color="#3fb950" /> Public
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Anyone on the internet can see this repository.
              </div>
            </div>
          </label>
          <label className="card" style={{ display: "flex", gap: 12, padding: 16, cursor: "pointer", border: `2px solid ${form.isPrivate ? "var(--accent)" : "var(--border)"}` }}>
            <input type="radio" name="visibility" checked={form.isPrivate} onChange={() => set("isPrivate", true)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <Lock size={16} color="#f85149" /> Private
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Only you can see and commit to this repository.
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Initialize this repository with:</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" checked={form.initReadme} onChange={(e) => set("initReadme", e.target.checked)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                <FileText size={14} /> Add a README file
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                This is where you can write a long description for your project.
              </div>
            </div>
          </label>
          <div>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 6, fontSize: 13 }}>License</label>
            <select value={form.license} onChange={(e) => set("license", e.target.value)} style={{ width: 200 }}>
              <option value="">None</option>
              <option value="MIT">MIT License</option>
              <option value="Apache-2.0">Apache License 2.0</option>
              <option value="GPL-3.0">GPL v3</option>
              <option value="BSD-2-Clause">BSD 2-Clause</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Default branch</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <GitBranch size={16} color="var(--text-muted)" />
          <input value={form.defaultBranch} onChange={(e) => set("defaultBranch", e.target.value)} style={{ width: 200 }} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "8px 20px", fontSize: 15 }}>
          {loading ? "Creating…" : "Create repository"}
        </button>
      </div>
    </form>
  );
}
