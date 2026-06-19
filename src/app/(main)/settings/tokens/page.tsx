"use client";
import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check, Shield, Clock } from "lucide-react";

interface TokenRecord {
  id: string;
  name: string;
  scopes: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const SCOPE_OPTIONS = [
  { value: "repo", label: "repo", description: "Full control of repositories" },
  { value: "issues", label: "issues", description: "Read and write issues" },
  { value: "admin", label: "admin", description: "Admin access" },
];

const EXPIRY_OPTIONS = [
  { value: "", label: "No expiry" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

function expiryToDate(expiry: string): string | undefined {
  if (!expiry) return undefined;
  const now = new Date();
  if (expiry === "30d") now.setDate(now.getDate() + 30);
  else if (expiry === "90d") now.setDate(now.getDate() + 90);
  else if (expiry === "1y") now.setFullYear(now.getFullYear() + 1);
  return now.toISOString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, border: "1px solid var(--border)",
      color: "var(--text-muted)", background: "rgba(255,255,255,0.04)",
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      <Shield size={9} /> {scope}
    </span>
  );
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [newExpiry, setNewExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user/tokens")
      .then((r) => r.json())
      .then((d) => {
        setTokens(d.tokens ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          scopes: newScopes,
          expiresAt: expiryToDate(newExpiry),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create token");
      } else {
        setTokens((prev) => [data.record, ...prev]);
        setCreatedToken(data.token);
        setNewName("");
        setNewScopes([]);
        setNewExpiry("");
        setShowForm(false);
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete token "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/user/tokens/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      // ignore
    }
  }

  function handleCopy() {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleScope(scope: string) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .token-item {
          animation: fadeUp 0.3s ease both;
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={20} /> Personal Access Tokens
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Tokens you have generated that can be used to access the GitCode API.
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setCreatedToken(null); }}>
            <Plus size={14} /> Generate new token
          </button>
        )}
      </div>

      {/* Newly created token reveal */}
      {createdToken && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 10,
          border: "1px solid rgba(63,185,80,0.4)",
          background: "rgba(63,185,80,0.08)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#3fb950", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> Token created successfully — copy it now. This token won&apos;t be shown again.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{
              flex: 1, fontFamily: "monospace", fontSize: 13,
              padding: "8px 12px", borderRadius: 6,
              background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)",
              color: "#3fb950", wordBreak: "break-all",
            }}>
              {createdToken}
            </code>
            <button className="btn btn-sm" onClick={handleCopy} style={{ flexShrink: 0, gap: 5 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>New personal access token</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Token name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My CI token"
                required
                style={{ width: "100%" }}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Give your token a descriptive name so you know what it&apos;s used for.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Scopes</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SCOPE_OPTIONS.map((opt) => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newScopes.includes(opt.value)}
                      onChange={() => toggleScope(opt.value)}
                      style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{opt.label}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{opt.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Expiration</label>
              <select
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                style={{ width: 220 }}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {createError && (
              <p style={{ color: "#ef4444", fontSize: 13 }}>{createError}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
                {creating ? "Generating…" : "Generate token"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => { setShowForm(false); setCreateError(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Token list */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Loading tokens…
        </div>
      ) : tokens.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: "center" }}>
          <Key size={40} style={{ margin: "0 auto 16px", opacity: 0.25, display: "block" }} />
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No personal access tokens</p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
            Generate a token to authenticate API requests without a password.
          </p>
          {!showForm && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Generate new token
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {tokens.map((token, i) => {
            const scopeList = token.scopes ? token.scopes.split(",").filter(Boolean) : [];
            return (
              <div
                key={token.id}
                className="token-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px 20px",
                  borderBottom: i < tokens.length - 1 ? "1px solid var(--border)" : "none",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Key size={15} color="var(--accent)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{token.name}</div>
                  <code style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {token.tokenPrefix}…
                  </code>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                    {scopeList.length > 0
                      ? scopeList.map((s) => <ScopeBadge key={s} scope={s} />)
                      : <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>No scopes</span>
                    }
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "var(--text-subtle)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={10} />
                      Created {formatDate(token.createdAt)}
                    </span>
                    <span>
                      Last used: {token.lastUsedAt ? formatDate(token.lastUsedAt) : "Never"}
                    </span>
                    {token.expiresAt && (
                      <span>
                        Expires: {formatDate(token.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-sm"
                  onClick={() => handleDelete(token.id, token.name)}
                  style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.2)", flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
