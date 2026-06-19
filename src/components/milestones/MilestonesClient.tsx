"use client";

import { useState } from "react";
import { Target, Plus, Trash2, Edit2, Check, X, CheckCircle, Clock } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  state: string;
  closedAt: string | null;
  createdAt: string;
  repoId: string;
  totalIssues: number;
  closedIssues: number;
}

interface Props {
  milestones: Milestone[];
  owner: string;
  repo: string;
  isOwner: boolean;
  activeState: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string | null, state: string): boolean {
  if (!dateStr || state === "closed") return false;
  return new Date(dateStr) < new Date();
}

interface MilestoneFormState {
  title: string;
  description: string;
  dueDate: string;
}

function MilestoneForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: MilestoneFormState;
  onSave: (data: MilestoneFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<MilestoneFormState>(initial);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-muted)" }}>
          Title *
        </label>
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Milestone title"
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-muted)" }}>
          Description
        </label>
        <textarea
          className="input"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          style={{ width: "100%", minHeight: 80, resize: "vertical" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-muted)" }}>
          Due date
        </label>
        <input
          type="date"
          className="input"
          value={form.dueDate}
          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-sm"
          style={{ background: "var(--accent)", color: "#fff", border: "none" }}
          onClick={() => onSave(form)}
          disabled={saving || !form.title}
        >
          <Check size={12} /> {saving ? "Saving…" : "Save milestone"}
        </button>
        <button className="btn btn-sm" onClick={onCancel} disabled={saving}>
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function MilestonesClient({ milestones: initial, owner, repo, isOwner, activeState }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(initial);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/repos/${owner}/${repo}/milestones`;

  async function handleCreate(data: MilestoneFormState) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, description: data.description, dueDate: data.dueDate || undefined }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to create milestone");
        return;
      }
      const { milestone } = await res.json();
      const enriched = { ...milestone, totalIssues: 0, closedIssues: 0 };
      setMilestones((prev) => [enriched, ...prev]);
      setShowNewForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: MilestoneFormState) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, description: data.description, dueDate: data.dueDate || null }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to update milestone");
        return;
      }
      const { milestone } = await res.json();
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...milestone, totalIssues: m.totalIssues, closedIssues: m.closedIssues } : m))
      );
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleState(m: Milestone) {
    const newState = m.state === "open" ? "closed" : "open";
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to update milestone");
        return;
      }
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    } catch {
      setError("Failed to update milestone");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this milestone?")) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to delete milestone");
        return;
      }
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("Failed to delete milestone");
    }
  }

  const openCount = milestones.filter((m) => m.state === "open").length;
  const closedCount = milestones.filter((m) => m.state === "closed").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={18} /> Milestones
        </h2>
        {isOwner && !showNewForm && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--accent)", color: "#fff", border: "none" }}
            onClick={() => setShowNewForm(true)}
          >
            <Plus size={12} /> New milestone
          </button>
        )}
      </div>

      {/* State tabs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        <a
          href="?state=open"
          style={{
            fontSize: 13,
            fontWeight: activeState === "open" ? 700 : 400,
            color: activeState === "open" ? "var(--text)" : "var(--text-muted)",
            paddingBottom: 8,
            borderBottom: activeState === "open" ? "2px solid var(--accent)" : "2px solid transparent",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Target size={13} /> {openCount} Open
        </a>
        <a
          href="?state=closed"
          style={{
            fontSize: 13,
            fontWeight: activeState === "closed" ? 700 : 400,
            color: activeState === "closed" ? "var(--text)" : "var(--text-muted)",
            paddingBottom: 8,
            borderBottom: activeState === "closed" ? "2px solid var(--accent)" : "2px solid transparent",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <CheckCircle size={13} /> {closedCount} Closed
        </a>
      </div>

      {error && (
        <div style={{ background: "#f8514922", border: "1px solid #f8514944", borderRadius: 6, padding: "8px 12px", color: "#f85149", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* New milestone form */}
      {isOwner && showNewForm && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Create milestone</h3>
          <MilestoneForm
            initial={{ title: "", description: "", dueDate: "" }}
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Milestones list */}
      {milestones.length === 0 && !showNewForm && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          <Target size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
          <p>No {activeState} milestones.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: milestones.length > 0 ? "1px solid var(--border)" : "none", borderRadius: 8, overflow: "hidden" }}>
        {milestones.map((m, idx) => {
          const pct = m.totalIssues > 0 ? Math.round((m.closedIssues / m.totalIssues) * 100) : 0;
          const overdue = isOverdue(m.dueDate, m.state);

          return (
            <div key={m.id} style={{ borderBottom: idx < milestones.length - 1 ? "1px solid var(--border)" : "none", background: "var(--bg)" }}>
              {editingId === m.id ? (
                <div style={{ padding: 16, background: "var(--bg-secondary)" }}>
                  <MilestoneForm
                    initial={{
                      title: m.title,
                      description: m.description,
                      dueDate: m.dueDate ? m.dueDate.slice(0, 10) : "",
                    }}
                    onSave={(data) => handleUpdate(m.id, data)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{m.title}</span>
                        {m.dueDate && (
                          <span style={{ fontSize: 12, color: overdue ? "#f85149" : "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Clock size={11} />
                            {overdue ? "Overdue · " : "Due "}{formatDate(m.dueDate)}
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>{m.description}</p>
                      )}
                      {/* Progress bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden", maxWidth: 200 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#3fb950", borderRadius: 4, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {pct}% — {m.closedIssues} of {m.totalIssues} issues closed
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-sm" onClick={() => setEditingId(m.id)} title="Edit">
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleToggleState(m)}
                          title={m.state === "open" ? "Close milestone" : "Reopen milestone"}
                        >
                          {m.state === "open" ? <CheckCircle size={12} /> : <Target size={12} />}
                          {m.state === "open" ? " Close" : " Reopen"}
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ color: "#f85149" }}
                          onClick={() => handleDelete(m.id)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
