"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, Key } from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: <User size={14} /> },
  { href: "/settings/organizations", label: "Organizations", icon: <Users size={14} /> },
  { href: "/settings/tokens", label: "Personal access tokens", icon: <Key size={14} /> },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 32, alignItems: "flex-start" }}>
      {/* Sidebar nav */}
      <nav style={{
        width: 220, flexShrink: 0, position: "sticky", top: "calc(var(--header-height) + 28px)",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 8, padding: "0 10px" }}>
          Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "7px 10px", borderRadius: 7, fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  textDecoration: "none", transition: "all 0.15s",
                  border: active ? "1px solid var(--border)" : "1px solid transparent",
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
                <span style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
