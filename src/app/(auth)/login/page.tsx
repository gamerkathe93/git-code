import type { Metadata } from "next";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in — GitCode" };

export default function LoginPage() {
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
            marginBottom: 24, color: "var(--text)",
            letterSpacing: "-0.02em",
          }}>
            Sign in to your account
          </h1>
          <LoginForm />
        </div>

        {/* Register link */}
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
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>New to GitCode?{" "}</span>
          <Link href="/register" style={{ fontWeight: 600, fontSize: 13, color: "var(--accent-hover)" }}>
            Create an account →
          </Link>
        </div>
      </div>
    </div>
  );
}
