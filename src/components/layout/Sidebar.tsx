"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookMarked,
  Compass, Bell, Settings, Users, ChevronRight,
  Plus, Lock
} from "lucide-react";

interface SidebarRepo { name: string; isPrivate: boolean; }
interface SidebarUser {
  username: string;
  name: string;
  avatarUrl: string;
  unreadCount: number;
  repos: SidebarRepo[];
}

const NAV = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { href: "/repositories",  icon: BookMarked,       label: "Repositories" },
  { href: "/explore",       icon: Compass,          label: "Explore" },
  { href: "/notifications", icon: Bell,             label: "Notifications" },
];

const SETTINGS_NAV = [
  { href: "/settings",               icon: Settings, label: "Settings" },
  { href: "/settings/organizations", icon: Users,    label: "Organizations" },
];

function NavLink({ href, icon: Icon, label, badge, active }: {
  href: string; icon: React.ElementType; label: string;
  badge?: number; active: boolean;
}) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 10px", borderRadius: 8, marginBottom: 1,
      color: active ? "var(--text)" : "var(--text-muted)",
      background: active
        ? "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))"
        : "transparent",
      textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400,
      border: active ? "1px solid rgba(59,130,246,0.15)" : "1px solid transparent",
      transition: "all 0.15s ease",
      position: "relative",
    }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text)";
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          background: "linear-gradient(135deg, #ef4444, #f97316)",
          color: "#fff", borderRadius: 10,
          minWidth: 18, height: 18, fontSize: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, padding: "0 5px",
          boxShadow: "0 0 8px rgba(239,68,68,0.35)",
        }}>{badge}</span>
      )}
    </Link>
  );
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const myRepos = user.repos.slice(0, 6);

  return (
    <aside style={{
      width: "var(--sidebar-width)",
      background: "rgba(8,11,16,0.8)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRight: "1px solid var(--border)",
      position: "fixed",
      top: "var(--header-height)",
      bottom: 0,
      left: 0,
      overflowY: "auto",
      padding: "12px 8px",
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      {/* User info */}
      <Link href={`/${user.username}`} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 10, marginBottom: 12,
        color: "var(--text)", textDecoration: "none",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        transition: "all 0.15s",
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt=""
            style={{
              width: 34, height: 34, borderRadius: 9,
              border: "2px solid rgba(59,130,246,0.3)",
            }}
          />
          <span style={{
            position: "absolute", bottom: -2, right: -2,
            width: 9, height: 9, borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid var(--bg)",
          }} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{user.name}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>@{user.username}</div>
        </div>
      </Link>

      {/* Main nav */}
      <nav style={{ marginBottom: 8 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              badge={item.href === "/notifications" ? user.unreadCount : undefined}
              active={active}
            />
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "4px 2px 12px" }} />

      {/* Recent repos */}
      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px", marginBottom: 6,
        }}>
          <span style={{
            color: "var(--text-subtle)", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Recent
          </span>
          <Link href="/new" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)", color: "var(--text-muted)",
            transition: "all 0.15s",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59,130,246,0.12)";
              e.currentTarget.style.color = "var(--accent-hover)";
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <Plus size={11} />
          </Link>
        </div>

        {myRepos.length === 0 && (
          <div style={{ padding: "8px 10px", color: "var(--text-subtle)", fontSize: 12 }}>
            No repositories yet
          </div>
        )}

        {myRepos.map((repo) => {
          const active = pathname.startsWith(`/${user.username}/${repo.name}`);
          return (
            <Link key={repo.name} href={`/${user.username}/${repo.name}`} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 7, marginBottom: 1,
              color: active ? "var(--text)" : "var(--text-muted)",
              background: active ? "rgba(255,255,255,0.05)" : "transparent",
              textDecoration: "none", fontSize: 12, fontWeight: active ? 500 : 400,
              transition: "all 0.12s",
            }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <BookMarked size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {repo.name}
              </span>
              {repo.isPrivate && (
                <Lock size={10} style={{ flexShrink: 0, opacity: 0.45 }} />
              )}
            </Link>
          );
        })}

        <Link href="/repositories" style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", color: "var(--text-subtle)",
          fontSize: 11, marginTop: 4, borderRadius: 6,
          textDecoration: "none", transition: "color 0.12s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-subtle)"}
        >
          <ChevronRight size={11} /> All repositories
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "8px 2px" }} />

      {/* Settings nav */}
      <nav style={{ paddingBottom: 4 }}>
        {SETTINGS_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={active}
            />
          );
        })}
      </nav>
    </aside>
  );
}
