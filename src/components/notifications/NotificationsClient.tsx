"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, GitPullRequest, CircleDot, Play, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const typeIcon: Record<string, React.ReactNode> = {
  pull_request: <GitPullRequest size={14} color="#3fb950" />,
  issue: <CircleDot size={14} color="#3fb950" />,
  pipeline: <Play size={14} color="#58a6ff" />,
  mention: <MessageSquare size={14} color="#f78166" />,
};

export default function NotificationsClient({ notifications }: { notifications: any[] }) {
  const [items, setItems] = useState(notifications);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAll: true }) });
    setItems(items.map(n => ({ ...n, isRead: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setItems(items.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  const unread = items.filter(n => !n.isRead).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h1>
          {unread > 0 && <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button className="btn btn-sm" onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: "center" }}>
          <Bell size={40} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <p style={{ color: "var(--text-muted)" }}>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {items.map((n, i) => (
            <Link
              key={n.id}
              href={n.url || "#"}
              onClick={() => markRead(n.id)}
              style={{ padding: "14px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: 12, alignItems: "flex-start", background: n.isRead ? "transparent" : "var(--bg-secondary)", cursor: "pointer", textDecoration: "none", color: "inherit" }}
            >
              <div style={{ marginTop: 2, flexShrink: 0 }}>{typeIcon[n.type] || <Bell size={14} />}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4 }}>{timeAgo(new Date(n.createdAt).toISOString())}</div>
              </div>
              {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
