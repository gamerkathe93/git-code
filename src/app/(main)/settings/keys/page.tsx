"use client";
import { useState, useEffect, useCallback } from "react";
import { Key, Plus, Trash2, Terminal, Copy, Check, Shield } from "lucide-react";

interface SSHKey {
  id: string;
  title: string;
  keyType: string;
  keyBody: string;
  fingerprint: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function KeyTypeChip({ type }: { type: string }) {
  const color =
    type === "ssh-ed25519"
      ? { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", text: "#34d399" }
      : type === "ssh-rsa"
      ? { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", text: "#fbbf24" }
      : { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)", text: "#a78bfa" };

  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: color.bg, border: `1px solid ${color.border}`, color: color.text,
      fontFamily: "monospace",
    }}>
      {type}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy fingerprint"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: copied ? "#34d399" : "var(--text-muted)",
        padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center",
        transition: "color 0.15s",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function SSHKeysPage() {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [keyText, setKeyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, key: keyText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to add key");
        return;
      }
      setKeys(prev => [data.key, ...prev]);
      setTitle("");
      setKeyText("");
      setShowForm(false);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, keyTitle: string) {
    if (!window.confirm(`Delete SSH key "${keyTitle}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/user/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
      }
    } catch {
      // silent
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={20} style={{ opacity: 0.7 }} />
            SSH Keys
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            SSH keys are used to authenticate Git operations over SSH.
          </p>
        </div>
        {!showForm && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> Add SSH Key
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="card" style={{
        padding: "16px 20px", marginBottom: 24,
        background: "rgba(59,130,246,0.05)",
        border: "1px solid rgba(59,130,246,0.15)",
        borderRadius: 10,
      }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Terminal size={16} style={{ color: "var(--accent-hover)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              How to generate and add an SSH key
            </p>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                <span style={{ color: "var(--text-subtle)" }}>1. Generate a new key:</span>
                <code style={{
                  display: "block", marginTop: 3, padding: "4px 10px",
                  background: "rgba(0,0,0,0.3)", borderRadius: 6,
                  fontFamily: "monospace", fontSize: 11, color: "#a5f3fc",
                }}>
                  ssh-keygen -t ed25519 -C &quot;your@email.com&quot;
                </code>
              </div>
              <div>
                <span style={{ color: "var(--text-subtle)" }}>2. Copy your public key:</span>
                <code style={{
                  display: "block", marginTop: 3, padding: "4px 10px",
                  background: "rgba(0,0,0,0.3)", borderRadius: 6,
                  fontFamily: "monospace", fontSize: 11, color: "#a5f3fc",
                }}>
                  cat ~/.ssh/id_ed25519.pub
                </code>
              </div>
              <p style={{ marginTop: 4 }}>
                Then paste the output into the &quot;Key&quot; field below when adding a new key.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add key form */}
      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={16} style={{ opacity: 0.7 }} /> Add new SSH key
          </h2>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. My MacBook Pro"
                required
                style={{ width: "100%" }}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                A friendly name to identify this key.
              </p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Key <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={keyText}
                onChange={e => setKeyText(e.target.value)}
                placeholder="ssh-ed25519 AAAA... user@machine"
                required
                rows={5}
                style={{
                  width: "100%", fontFamily: "monospace", fontSize: 12,
                  resize: "vertical",
                }}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Paste your public key here. It starts with <code style={{ fontFamily: "monospace" }}>ssh-ed25519</code>, <code style={{ fontFamily: "monospace" }}>ssh-rsa</code>, or similar.
              </p>
            </div>
            {formError && (
              <div style={{
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13,
              }}>
                {formError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Adding…" : "Add SSH Key"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => { setShowForm(false); setFormError(""); setTitle(""); setKeyText(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Loading SSH keys…
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "#ef4444", fontSize: 14 }}>
          {error}
        </div>
      ) : keys.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: "center" }}>
          <Key size={44} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No SSH keys</p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            You haven&apos;t added any SSH keys yet. SSH keys let you authenticate<br />
            with GitCode without entering your password each time.
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> Add your first SSH key
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{
              padding: "18px 20px",
              borderBottom: i < keys.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", alignItems: "flex-start", gap: 16,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Key size={17} style={{ color: "var(--accent-hover)", opacity: 0.8 }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{k.title}</span>
                  <KeyTypeChip type={k.keyType} />
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                }}>
                  <code style={{
                    fontFamily: "monospace", fontSize: 11,
                    color: "var(--text-muted)", wordBreak: "break-all",
                  }}>
                    {k.fingerprint}
                  </code>
                  <CopyButton text={k.fingerprint} />
                </div>

                <div style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", gap: 16 }}>
                  <span>Added {timeAgo(k.createdAt)}</span>
                  {k.lastUsedAt ? (
                    <span>Last used {timeAgo(k.lastUsedAt)}</span>
                  ) : (
                    <span style={{ fontStyle: "italic" }}>Never used</span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-sm"
                onClick={() => handleDelete(k.id, k.title)}
                style={{
                  color: "#ef4444", borderColor: "rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.06)",
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                }}
                title="Delete this SSH key"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
