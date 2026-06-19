"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch, Bell, Plus, Search, ChevronDown,
  User, Settings, LogOut, BookMarked, Code, Zap
} from "lucide-react";

interface NavbarUser {
  username: string;
  name: string;
  avatarUrl: string;
  unreadCount: number;
}

export default function Navbar({ user }: { user: NavbarUser }) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const unread = user.unreadCount;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header style={{
      height: "var(--header-height)",
      background: "rgba(8,11,16,0.85)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "var(--text)", textDecoration: "none", flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(59,130,246,0.3)",
        }}>
          <GitBranch size={15} color="#fff" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>GitCode</span>
      </Link>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 440, position: "relative" }}>
        <Search size={13} style={{
          position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)", color: "var(--text-subtle)", pointerEvents: "none",
        }} />
        <input
          placeholder="Search repos, issues, PRs…"
          style={{
            paddingLeft: 32, paddingRight: 36,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 8, width: "100%", fontSize: 13,
            transition: "all 0.18s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "rgba(59,130,246,0.06)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-subtle)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <span style={{
          position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
          color: "var(--text-subtle)", fontSize: 10, fontWeight: 600,
          border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px",
          letterSpacing: "0.04em",
        }}>/</span>
      </div>

      <nav style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
        {[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/explore", label: "Explore" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500,
            color: "var(--text-muted)", textDecoration: "none",
            transition: "color 0.15s, background 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
          >
            {item.label}
          </Link>
        ))}

        {/* New dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-sm"
            onClick={() => setShowNewMenu(!showNewMenu)}
            onBlur={() => setTimeout(() => setShowNewMenu(false), 150)}
            style={{ gap: 3 }}
          >
            <Plus size={13} />
            <ChevronDown size={10} style={{ opacity: 0.7 }} />
          </button>
          {showNewMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "rgba(13,17,23,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              borderRadius: 10, zIndex: 200, padding: "4px",
              minWidth: 190,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
              animation: "fadeInScale 0.15s ease both",
            }}>
              {[
                { href: "/new", icon: <Code size={14} />, label: "New repository" },
                { href: "/new-org", icon: <User size={14} />, label: "New organization" },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 12px", color: "var(--text)", fontSize: 13,
                  borderRadius: 6, textDecoration: "none",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Link href="/notifications" style={{
          position: "relative", display: "flex", alignItems: "center",
          justifyContent: "center", width: 32, height: 32,
          color: "var(--text-muted)", borderRadius: 8,
          border: "1px solid var(--border)", background: "transparent",
          transition: "all 0.15s",
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)";
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <Bell size={15} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              color: "#fff", borderRadius: "50%",
              width: 16, height: 16, fontSize: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, border: "2px solid var(--bg)",
              boxShadow: "0 0 8px rgba(239,68,68,0.4)",
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </Link>

        {/* User menu */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)}
            onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)", borderRadius: 8,
              cursor: "pointer", padding: "3px 6px 3px 3px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <img
              src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt={user.username}
              style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <ChevronDown size={11} color="var(--text-muted)" />
          </button>

          {showUserMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "rgba(13,17,23,0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              borderRadius: 10, zIndex: 200, padding: "4px",
              minWidth: 210,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
              animation: "fadeInScale 0.15s ease both",
            }}>
              <div style={{
                padding: "10px 12px 10px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt="" style={{ width: 36, height: 36, borderRadius: 8, border: "2px solid var(--border)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>@{user.username}</div>
                  </div>
                </div>
              </div>

              {[
                { href: `/${user.username}`, icon: <User size={14} />, label: "Your profile" },
                { href: "/repositories", icon: <BookMarked size={14} />, label: "Your repositories" },
                { href: "/settings", icon: <Settings size={14} />, label: "Settings" },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 12px", color: "var(--text)", fontSize: 13,
                  borderRadius: 6, textDecoration: "none",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "var(--text-muted)" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
                <button onClick={signOut} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 12px", color: "var(--danger-text)", fontSize: 13,
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  borderRadius: 6, textAlign: "left", transition: "background 0.12s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
