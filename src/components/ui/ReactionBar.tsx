"use client";
import { useState } from "react";

const EMOJI_OPTIONS = ["👍", "👎", "❤️", "😄", "🎉", "😕", "👀", "🚀"];

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Props {
  commentId: string;
  reactions: ReactionCount[];
  currentUserId?: string;
}

export default function ReactionBar({ commentId, reactions: initial, currentUserId }: Props) {
  const [reactions, setReactions] = useState<ReactionCount[]>(initial);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (!currentUserId) return;
    setLoading(emoji);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        setReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji);
          if (existing) {
            if (data.action === "removed") {
              return existing.count <= 1
                ? prev.filter(r => r.emoji !== emoji)
                : prev.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r);
            } else {
              return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r);
            }
          } else if (data.action === "added") {
            return [...prev, { emoji, count: 1, hasReacted: true }];
          }
          return prev;
        });
      }
    } finally {
      setLoading(null);
      setShowPicker(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggle(r.emoji)}
          disabled={!currentUserId || loading === r.emoji}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 20,
            border: `1px solid ${r.hasReacted ? "rgba(56,189,248,0.5)" : "var(--border)"}`,
            background: r.hasReacted ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.04)",
            cursor: currentUserId ? "pointer" : "default",
            fontSize: 13, color: "var(--text)",
            transition: "all 0.15s",
          }}
        >
          <span>{r.emoji}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.count}</span>
        </button>
      ))}

      {currentUserId && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            style={{
              padding: "2px 8px", borderRadius: 20,
              border: "1px solid var(--border)", background: "none",
              cursor: "pointer", fontSize: 14, color: "var(--text-muted)",
              transition: "all 0.15s",
            }}
            title="Add reaction"
          >
            😊 +
          </button>
          {showPicker && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 8, display: "flex", gap: 4,
              zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggle(emoji)}
                  style={{
                    fontSize: 18, padding: "4px 6px", borderRadius: 6,
                    border: "none", background: "none", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
