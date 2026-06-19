"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", bio: "", company: "", location: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setUsername(d.user.username);
        setForm({
          name: d.user.name || "",
          bio: d.user.bio || "",
          company: d.user.company || "",
          location: d.user.location || "",
          website: d.user.website || "",
        });
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaveError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Failed to save profile. Please try again.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text", hint?: string) => (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {key === "bio" ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={3}
          style={{ width: "100%", resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%" }}
        />
      )}
      {hint && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Public profile</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {field("Name", "name", "text", "Your name may appear around GitCode where you contribute.")}
          {field("Bio", "bio", "text", "Tell us a little about yourself.")}
          {field("Company", "company")}
          {field("Location", "location")}
          {field("Website", "website", "url")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save profile"}
            </button>
            {saved && <span style={{ color: "#3fb950", fontSize: 13 }}>✓ Profile saved</span>}
          </div>
          {saveError && (
            <span style={{ color: "#ef4444", fontSize: 13 }}>{saveError}</span>
          )}
        </div>
      </form>
    </div>
  );
}
