"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
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
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "10px 14px",
          color: "#f87171", fontSize: 13,
          animation: "fadeIn 0.2s ease both",
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div>
        <label style={{
          display: "block", fontSize: 12, fontWeight: 600,
          marginBottom: 7, color: "var(--text-muted)", letterSpacing: "0.02em",
        }}>
          USERNAME OR EMAIL
        </label>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Enter your username or email"
          autoComplete="username"
          required
          style={{ fontSize: 14 }}
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            PASSWORD
          </label>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            style={{ fontSize: 14, paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", display: "flex", alignItems: "center",
              padding: 0, transition: "color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px 0",
          fontSize: 14,
          fontWeight: 600,
          marginTop: 4,
          justifyContent: "center",
          letterSpacing: "0.01em",
        }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", display: "inline-block",
            }} />
            Signing in…
          </span>
        ) : "Sign in"}
      </button>
    </form>
  );
}
