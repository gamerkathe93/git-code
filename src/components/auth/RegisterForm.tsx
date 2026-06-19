"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{
          background: "rgba(248,81,73,0.1)", border: "1px solid #f85149",
          borderRadius: 6, padding: "10px 14px", color: "#f85149", fontSize: 13
        }}>
          {error}
        </div>
      )}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Full name</label>
        <input value={form.name} onChange={set("name")} placeholder="Jane Doe" required style={{ width: "100%" }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email address</label>
        <input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" required style={{ width: "100%" }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Username</label>
        <input
          value={form.username}
          onChange={set("username")}
          placeholder="jane-doe"
          pattern="[a-zA-Z0-9_\-]+"
          title="Only letters, numbers, hyphens, and underscores"
          required
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder="minimum 8 characters"
          minLength={8}
          autoComplete="new-password"
          required
          style={{ width: "100%" }}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: "100%", padding: "9px 0", fontSize: 14 }}
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
