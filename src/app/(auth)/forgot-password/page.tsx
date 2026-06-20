"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow blobs */}
      <div style={{
        position: "fixed",
        top: "15%", left: "50%",
        width: 600, height: 400,
        transform: "translateX(-50%)",
        background: "radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed",
        bottom: "10%", left: "20%",
        width: 400, height: 300,
        background: "radial-gradient(ellipse at center, rgba(139,92,246,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, marginBottom: 32, animation: "fadeIn 0.3s ease both",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.4)",
          }}>
            <GitBranch size={22} color="#fff" />
          </div>
          <span style={{
            fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #e2e8f4, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>GitCode</span>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(13,17,23,0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "fadeInScale 0.25s ease both",
        }}>
          <h1 style={{
            fontSize: 19, fontWeight: 700, textAlign: "center",
            marginBottom: 8, color: "var(--text)",
            letterSpacing: "-0.02em",
          }}>
            Reset your password
          </h1>
          <p style={{
            fontSize: 13, color: "var(--text-muted)", textAlign: "center",
            marginBottom: 24, lineHeight: 1.5,
          }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {success ? (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 8, padding: "12px 14px",
              color: "#4ade80", fontSize: 13,
              animation: "fadeIn 0.2s ease both",
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Check your email for a reset link. If that email is registered, you&apos;ll receive instructions shortly.</span>
            </div>
          ) : (
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
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                  style={{ fontSize: 14 }}
                />
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
                    Sending…
                  </span>
                ) : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        {/* Back to login link */}
        <div style={{
          marginTop: 14,
          background: "rgba(13,17,23,0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px",
          textAlign: "center",
          animation: "fadeIn 0.3s 0.1s ease both",
        }}>
          <Link href="/login" style={{ fontWeight: 600, fontSize: 13, color: "var(--accent-hover)" }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
