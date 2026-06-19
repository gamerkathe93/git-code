import type { Metadata } from "next";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account — GitCode" };

const FEATURES = [
  { icon: "⚡", title: "CI/CD Pipelines", desc: "Automated build, test, and deploy workflows." },
  { icon: "🔀", title: "Pull Requests", desc: "Code review with inline comments and approvals." },
  { icon: "🐛", title: "Issue Tracking", desc: "Labels, milestones, and project boards." },
  { icon: "🌿", title: "Branch Protection", desc: "Rules, required checks, and merge controls." },
  { icon: "🪝", title: "Webhooks & API", desc: "Integrate with any tool via REST API & webhooks." },
];

export default function RegisterPage() {
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
      {/* Ambient glows */}
      <div style={{
        position: "fixed", top: "10%", right: "10%",
        width: 500, height: 400,
        background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "10%", left: "5%",
        width: 400, height: 300,
        background: "radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <Link href="/login" style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 32, textDecoration: "none",
        animation: "fadeIn 0.3s ease both",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(59,130,246,0.3)",
        }}>
          <GitBranch size={20} color="#fff" />
        </div>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, #e2e8f4, #94a3b8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>GitCode</span>
      </Link>

      <div style={{
        display: "flex", gap: 32, alignItems: "flex-start",
        width: "100%", maxWidth: 860,
        animation: "fadeInScale 0.25s ease both",
      }}>
        {/* Form card */}
        <div style={{
          flex: 1,
          background: "rgba(13,17,23,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Create your account
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 600, color: "var(--accent-hover)" }}>Sign in →</Link>
          </p>
          <RegisterForm />
        </div>

        {/* Feature list */}
        <div style={{ width: 260, flexShrink: 0, paddingTop: 8 }}>
          <h2 style={{
            fontSize: 16, fontWeight: 700, marginBottom: 20,
            letterSpacing: "-0.02em", lineHeight: 1.4,
          }}>
            Everything you need to{" "}
            <span style={{
              background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>ship software.</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                animation: `fadeIn 0.3s ${i * 0.06}s ease both`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.title}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
