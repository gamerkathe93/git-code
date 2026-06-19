"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Trash2, TriangleAlert, Shield, GitBranch, Link2, Plus, Check, X, Bell } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchProtection {
  id: string;
  pattern: string;
  requirePullRequest: boolean;
  requiredApprovals: number;
  requireStatusChecks: boolean;
  dismissStaleReviews: boolean;
  allowForcePush: boolean;
  createdAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

const WEBHOOK_EVENTS = ["push", "pull_request", "issues", "release", "pipeline"];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Chip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: active ? "var(--accent-subtle)" : "var(--surface-overlay)",
        color: active ? "var(--accent)" : "var(--text-muted)",
        border: "1px solid",
        borderColor: active ? "var(--accent-muted)" : "var(--border-muted)",
      }}
    >
      {active ? <Check size={10} /> : <X size={10} />}
      {label}
    </span>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function RepoSettingsPage() {
  const router = useRouter();
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoName } = params;

  // General settings
  const [form, setForm] = useState({ description: "", isPrivate: false, defaultBranch: "main" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Branch protection
  const [protections, setProtections] = useState<BranchProtection[]>([]);
  const [protectForm, setProtectForm] = useState({
    pattern: "",
    requirePullRequest: false,
    requiredApprovals: 1,
    requireStatusChecks: false,
    dismissStaleReviews: false,
    allowForcePush: false,
  });
  const [showProtectForm, setShowProtectForm] = useState(false);
  const [protectLoading, setProtectLoading] = useState(false);
  const [protectError, setProtectError] = useState("");

  // Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookForm, setWebhookForm] = useState({
    url: "",
    secret: "",
    events: [] as string[],
    isActive: true,
  });
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  // ── Load data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/repos/${username}/${repoName}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.repo)
          setForm({
            description: d.repo.description ?? "",
            isPrivate: d.repo.isPrivate,
            defaultBranch: d.repo.defaultBranch,
          });
      });

    fetch(`/api/repos/${username}/${repoName}/branches/protect`)
      .then((r) => r.json())
      .then((d) => { if (d.protections) setProtections(d.protections); });

    fetch(`/api/repos/${username}/${repoName}/webhooks`)
      .then((r) => r.json())
      .then((d) => { if (d.webhooks) setWebhooks(d.webhooks); });
  }, [username, repoName]);

  // ── General save ─────────────────────────────────────────────────────────────

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/repos/${username}/${repoName}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "Save failed");
    }
  }

  async function deleteRepo() {
    if (deleteConfirm !== repoName) return;
    const res = await fetch(`/api/repos/${username}/${repoName}`, { method: "DELETE" });
    if (res.ok) router.push("/repositories");
  }

  // ── Branch protection ────────────────────────────────────────────────────────

  async function addProtection(e: React.FormEvent) {
    e.preventDefault();
    setProtectLoading(true);
    setProtectError("");
    const res = await fetch(`/api/repos/${username}/${repoName}/branches/protect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(protectForm),
    });
    setProtectLoading(false);
    if (res.ok) {
      const d = await res.json();
      setProtections((prev) => {
        const idx = prev.findIndex((p) => p.pattern === d.protection.pattern);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = d.protection;
          return updated;
        }
        return [...prev, d.protection];
      });
      setProtectForm({
        pattern: "",
        requirePullRequest: false,
        requiredApprovals: 1,
        requireStatusChecks: false,
        dismissStaleReviews: false,
        allowForcePush: false,
      });
      setShowProtectForm(false);
    } else {
      const d = await res.json();
      setProtectError(d.error || "Failed to save");
    }
  }

  async function deleteProtection(id: string) {
    const res = await fetch(`/api/repos/${username}/${repoName}/branches/protect/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setProtections((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Webhooks ─────────────────────────────────────────────────────────────────

  function toggleEvent(ev: string) {
    setWebhookForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookLoading(true);
    setWebhookError("");
    const res = await fetch(`/api/repos/${username}/${repoName}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookForm),
    });
    setWebhookLoading(false);
    if (res.ok) {
      const d = await res.json();
      setWebhooks((prev) => [d.webhook, ...prev]);
      setWebhookForm({ url: "", secret: "", events: [], isActive: true });
      setShowWebhookForm(false);
    } else {
      const d = await res.json();
      setWebhookError(d.error || "Failed to create webhook");
    }
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/repos/${username}/${repoName}/webhooks/${id}`, {
      method: "DELETE",
    });
    if (res.ok) setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Repository settings</h2>

      {/* General */}
      <form onSubmit={save} className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>General</h3>
        {error && <div style={{ color: "#f85149", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            style={{ width: "100%" }}
            placeholder="Short description"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => setForm((f) => ({ ...f, isPrivate: e.target.checked }))}
            />
            <span style={{ fontWeight: 600 }}>Private repository</span>
          </label>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginLeft: 20 }}>
            Only you can see this repository.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </button>
          {saved && <span style={{ color: "#3fb950", fontSize: 13 }}>✓ Saved</span>}
        </div>
      </form>

      {/* Danger Zone */}
      <div className="card" style={{ padding: 24, border: "1px solid #f85149", marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#f85149",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <TriangleAlert size={14} /> Danger Zone
        </h3>
        <div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            Type <strong>{repoName}</strong> to confirm deletion. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={repoName}
              style={{ flex: 1 }}
            />
            <button
              onClick={deleteRepo}
              disabled={deleteConfirm !== repoName}
              style={{
                background: "#f85149",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: deleteConfirm === repoName ? "pointer" : "not-allowed",
                opacity: deleteConfirm === repoName ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Trash2 size={13} /> Delete repository
            </button>
          </div>
        </div>
      </div>

      {/* Branch Protection */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Shield size={14} /> Branch Protection
          </h3>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowProtectForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <Plus size={13} /> Add rule
          </button>
        </div>

        {showProtectForm && (
          <form
            onSubmit={addProtection}
            style={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-muted)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {protectError && (
              <div style={{ color: "#f85149", fontSize: 13, marginBottom: 10 }}>{protectError}</div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Branch pattern (e.g. main, release/*)
              </label>
              <input
                required
                value={protectForm.pattern}
                onChange={(e) => setProtectForm((f) => ({ ...f, pattern: e.target.value }))}
                placeholder="main"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={protectForm.requirePullRequest}
                  onChange={(e) => setProtectForm((f) => ({ ...f, requirePullRequest: e.target.checked }))}
                />
                Require pull request before merging
              </label>

              {protectForm.requirePullRequest && (
                <div style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <label>Required approvals:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={protectForm.requiredApprovals}
                    onChange={(e) =>
                      setProtectForm((f) => ({ ...f, requiredApprovals: Number(e.target.value) }))
                    }
                    style={{ width: 60 }}
                  />
                </div>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={protectForm.requireStatusChecks}
                  onChange={(e) => setProtectForm((f) => ({ ...f, requireStatusChecks: e.target.checked }))}
                />
                Require status checks to pass
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={protectForm.dismissStaleReviews}
                  onChange={(e) => setProtectForm((f) => ({ ...f, dismissStaleReviews: e.target.checked }))}
                />
                Dismiss stale pull request reviews
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={protectForm.allowForcePush}
                  onChange={(e) => setProtectForm((f) => ({ ...f, allowForcePush: e.target.checked }))}
                />
                Allow force push
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={protectLoading}>
                {protectLoading ? "Saving…" : "Save rule"}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowProtectForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {protections.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
            No branch protection rules yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {protections.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border-muted)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GitBranch size={13} style={{ color: "var(--accent)" }} />
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-muted)",
                      }}
                    >
                      {p.pattern}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <Chip label="Require PR" active={p.requirePullRequest} />
                    {p.requirePullRequest && (
                      <Chip label={`${p.requiredApprovals} approval${p.requiredApprovals !== 1 ? "s" : ""}`} active />
                    )}
                    <Chip label="Status checks" active={p.requireStatusChecks} />
                    <Chip label="Dismiss stale" active={p.dismissStaleReviews} />
                    <Chip label="Force push" active={p.allowForcePush} />
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => deleteProtection(p.id)}
                  style={{ color: "#f85149", flexShrink: 0 }}
                  title="Delete rule"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Link2 size={14} /> Webhooks
          </h3>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowWebhookForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <Plus size={13} /> Add webhook
          </button>
        </div>

        {showWebhookForm && (
          <form
            onSubmit={addWebhook}
            style={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-muted)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {webhookError && (
              <div style={{ color: "#f85149", fontSize: 13, marginBottom: 10 }}>{webhookError}</div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Payload URL *
              </label>
              <input
                required
                type="url"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/webhook"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Secret (optional)
              </label>
              <input
                type="password"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="Signing secret"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Events</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {WEBHOOK_EVENTS.map((ev) => (
                  <label
                    key={ev}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                    />
                    {ev}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={webhookForm.isActive}
                  onChange={(e) => setWebhookForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={webhookLoading}>
                {webhookLoading ? "Creating…" : "Create webhook"}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setShowWebhookForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {webhooks.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
            No webhooks configured yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {webhooks.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border-muted)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bell size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 320,
                      }}
                      title={w.url}
                    >
                      {w.url}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 10,
                        background: w.isActive ? "#1a7f371a" : "var(--surface-overlay)",
                        color: w.isActive ? "#3fb950" : "var(--text-muted)",
                        border: "1px solid",
                        borderColor: w.isActive ? "#3fb95033" : "var(--border-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {w.isActive ? "active" : "inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {w.events.length === 0 ? (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>no events</span>
                    ) : (
                      w.events.map((ev) => (
                        <span
                          key={ev}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "1px 7px",
                            borderRadius: 10,
                            background: "var(--accent-subtle)",
                            color: "var(--accent)",
                            border: "1px solid var(--accent-muted)",
                          }}
                        >
                          {ev}
                        </span>
                      ))
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Added {new Date(w.createdAt).toLocaleDateString()} ·{" "}
                    <a
                      href={`/${username}/${repoName}/settings/webhooks/${w.id}`}
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      View deliveries
                    </a>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => deleteWebhook(w.id)}
                  style={{ color: "#f85149", flexShrink: 0 }}
                  title="Delete webhook"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
