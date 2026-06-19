"use client";

import { useState } from "react";
import { Tag, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
  repoId: string;
}

interface Props {
  labels: Label[];
  owner: string;
  repo: string;
  isOwner: boolean;
}

const COLOR_SWATCHES = [
  "#0075ca", "#e4e669", "#d73a4a", "#cfd3d7", "#a2eeef",
  "#7057ff", "#008672", "#e11d48", "#f97316", "#84cc16",
];

function getTextColor(bg: string): string {
  const hex = bg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

interface LabelFormState {
  name: string;
  color: string;
  description: string;
}

function LabelForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: LabelFormState;
  onSave: (data: LabelFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<LabelFormState>(initial);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-muted)" }}>
            Label name
          </label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Label name"
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-muted)" }}>
            Description
          </label>
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            style={{ width: "100%" }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>
          Color
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: c,
                border: form.color === c ? "3px solid var(--text)" : "2px solid transparent",
                cursor: "pointer",
                outline: "none",
                padding: 0,
              }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            style={{ width: 32, height: 28, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 4, padding: 2, background: "var(--bg-secondary)" }}
            title="Custom color"
          />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: form.color,
              color: getTextColor(form.color),
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Tag size={10} />
            {form.name || "Preview"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-sm"
          style={{ background: "var(--accent)", color: "#fff", border: "none" }}
          onClick={() => onSave(form)}
          disabled={saving || !form.name || !form.color}
        >
          <Check size={12} /> {saving ? "Saving…" : "Save label"}
        </button>
        <button className="btn btn-sm" onClick={onCancel} disabled={saving}>
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function LabelsClient({ labels: initialLabels, owner, repo, isOwner }: Props) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/repos/${owner}/${repo}/labels`;

  async function handleCreate(data: LabelFormState) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to create label");
        return;
      }
      const { label } = await res.json();
      setLabels((prev) => [...prev, label]);
      setShowNewForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: LabelFormState) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to update label");
        return;
      }
      const { label } = await res.json();
      setLabels((prev) => prev.map((l) => (l.id === id ? label : l)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this label?")) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to delete label");
        return;
      }
      setLabels((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Failed to delete label");
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Tag size={18} /> Labels
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>{labels.length} labels</span>
        </h2>
        {isOwner && !showNewForm && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--accent)", color: "#fff", border: "none" }}
            onClick={() => setShowNewForm(true)}
          >
            <Plus size={12} /> New label
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#f8514922", border: "1px solid #f8514944", borderRadius: 6, padding: "8px 12px", color: "#f85149", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* New label form */}
      {isOwner && showNewForm && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Create label</h3>
          <LabelForm
            initial={{ name: "", color: "#0075ca", description: "" }}
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Labels list */}
      {labels.length === 0 && !showNewForm && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          <Tag size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
          <p>No labels yet.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: labels.length > 0 ? "1px solid var(--border)" : "none", borderRadius: 8, overflow: "hidden" }}>
        {labels.map((label, idx) => (
          <div key={label.id}>
            {editingId === label.id ? (
              <div style={{ padding: 16, background: "var(--bg-secondary)", borderBottom: idx < labels.length - 1 ? "1px solid var(--border)" : "none" }}>
                <LabelForm
                  initial={{ name: label.name, color: label.color, description: label.description ?? "" }}
                  onSave={(data) => handleUpdate(label.id, data)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "var(--bg)",
                  borderBottom: idx < labels.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: label.color,
                    color: getTextColor(label.color),
                    borderRadius: 12,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 80,
                    flexShrink: 0,
                  }}
                >
                  <Tag size={10} /> {label.name}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-muted)" }}>
                  {label.description || ""}
                </span>
                {isOwner && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingId(label.id)}
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ color: "#f85149" }}
                      onClick={() => handleDelete(label.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
