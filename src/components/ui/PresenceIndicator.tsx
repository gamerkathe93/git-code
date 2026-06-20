"use client";
import { useState, useEffect, useCallback } from "react";

interface Viewer {
  id: string;
  username: string;
  avatarUrl: string;
}

export default function PresenceIndicator({ pageKey }: { pageKey: string }) {
  const [viewers, setViewers] = useState<Viewer[]>([]);

  const ping = useCallback(async () => {
    try {
      const res = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewers(data.viewers || []);
      }
    } catch {}
  }, [pageKey]);

  useEffect(() => {
    ping(); // immediate
    const interval = setInterval(ping, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, [ping]);

  if (viewers.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Also viewing:</span>
      <div style={{ display: "flex", alignItems: "center" }}>
        {viewers.slice(0, 5).map((v, i) => (
          <div
            key={v.id}
            title={v.username}
            style={{
              marginLeft: i === 0 ? 0 : -6,
              width: 22, height: 22,
              borderRadius: "50%",
              border: "2px solid var(--bg-card)",
              overflow: "hidden",
              position: "relative",
              zIndex: viewers.length - i,
            }}
          >
            <img
              src={v.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.username}`}
              alt={v.username}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        ))}
        {viewers.length > 5 && (
          <div style={{
            marginLeft: -6, width: 22, height: 22, borderRadius: "50%",
            background: "var(--bg-secondary)", border: "2px solid var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "var(--text-muted)",
          }}>
            +{viewers.length - 5}
          </div>
        )}
      </div>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
        boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
        animation: "presencePulse 2s infinite",
        display: "inline-block",
      }} />
      <style>{`@keyframes presencePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
