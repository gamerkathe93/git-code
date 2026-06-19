"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slugify = (v: string) =>
    v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayName, description }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to create organization"); return; }
    router.push(`/orgs/${data.org.name}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Users size={28} color="var(--accent)" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Create a new organization</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Organizations let teams collaborate across many repositories.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        {error && (
          <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid #f85149", borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Display name <span style={{ color: "var(--danger-text)" }}>*</span>
          </label>
          <input
            value={displayName}
            onChange={e => {
              setDisplayName(e.target.value);
              if (!name) setName(slugify(e.target.value));
            }}
            placeholder="My Organization"
            required
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            URL name <span style={{ color: "var(--danger-text)" }}>*</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <span style={{ padding: "8px 12px", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: 13, borderRight: "1px solid var(--border)", whiteSpace: "nowrap" }}>
              gitcode.local/orgs/
            </span>
            <input
              value={name}
              onChange={e => setName(slugify(e.target.value))}
              placeholder="my-organization"
              required
              style={{ border: "none", borderRadius: 0, flex: 1 }}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does your organization do?"
            rows={3}
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !name || !displayName}>
          {loading ? "Creating…" : "Create organization"}
        </button>
      </form>
    </div>
  );
}
