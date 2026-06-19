"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Lock, Globe, FileText, Sparkles, ArrowRight, Check } from "lucide-react";

export default function CreateRepoForm({ username }: { username: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    defaultBranch: "main",
    initReadme: false,
    license: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nameValid, setNameValid] = useState<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(val: string) {
    set("name", val);
    if (!val) { setNameValid(null); return; }
    setNameValid(/^[a-zA-Z0-9._-]+$/.test(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name) { setError("Repository name is required"); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.name)) {
      setError("Name can only contain letters, numbers, dots, hyphens, and underscores");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          isPrivate: form.isPrivate,
          defaultBranch: form.defaultBranch,
          initReadme: form.initReadme,
          license: form.license || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create repository"); return; }
      router.push(`/${username}/${form.name}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(88, 166, 255, 0); }
          50%       { box-shadow: 0 0 20px 4px rgba(88, 166, 255, 0.25); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .cr-section {
          opacity: 0;
          animation: fadeUp 0.45s ease forwards;
        }
        .cr-section:nth-child(1) { animation-delay: 0ms; }
        .cr-section:nth-child(2) { animation-delay: 60ms; }
        .cr-section:nth-child(3) { animation-delay: 120ms; }
        .cr-section:nth-child(4) { animation-delay: 180ms; }
        .cr-section:nth-child(5) { animation-delay: 240ms; }
        .cr-section:nth-child(6) { animation-delay: 300ms; }
        .cr-section:nth-child(7) { animation-delay: 360ms; }

        .cr-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: var(--text-primary);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
        }
        .cr-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(88,166,255,0.12);
          background: var(--bg-primary);
        }
        .cr-input::placeholder { color: var(--text-muted); }

        .vis-card {
          display: flex;
          gap: 14px;
          padding: 18px;
          border-radius: 12px;
          border: 2px solid var(--border);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.15s, box-shadow 0.2s;
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .vis-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 10px;
        }
        .vis-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .vis-card.selected-public  { border-color: #3fb950; background: rgba(63,185,80,0.05); box-shadow: 0 0 0 1px rgba(63,185,80,0.2), 0 4px 16px rgba(63,185,80,0.1); }
        .vis-card.selected-private { border-color: #f85149; background: rgba(248,81,73,0.05); box-shadow: 0 0 0 1px rgba(248,81,73,0.2), 0 4px 16px rgba(248,81,73,0.1); }

        .vis-radio {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 2px solid var(--border);
          margin-top: 2px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .vis-radio.checked-public  { border-color: #3fb950; background: #3fb950; }
        .vis-radio.checked-private { border-color: #f85149; background: #f85149; }
        .vis-radio-dot {
          width: 6px; height: 6px;
          background: white;
          border-radius: 50%;
          animation: checkPop 0.2s ease;
        }

        .init-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .init-row:hover { border-color: var(--accent); background: rgba(88,166,255,0.04); }
        .init-row.active { border-color: var(--accent); background: rgba(88,166,255,0.07); }

        .custom-check {
          width: 18px; height: 18px;
          border-radius: 5px;
          border: 2px solid var(--border);
          margin-top: 1px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .custom-check.checked { border-color: var(--accent); background: var(--accent); }

        .btn-create {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          background: linear-gradient(135deg, var(--accent), #1a7fd4);
          color: white;
          font-weight: 600;
          font-size: 15px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          overflow: hidden;
        }
        .btn-create::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
        .btn-create:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(88,166,255,0.35); }
        .btn-create:active:not(:disabled) { transform: translateY(0); }
        .btn-create:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .url-preview {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-radius: 6px;
          border: 1px solid var(--border);
          font-family: monospace;
          animation: fadeIn 0.2s ease;
        }
        .url-preview span { color: var(--accent); }

        .name-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-top: 6px;
          animation: fadeIn 0.2s ease;
        }
        .name-status.valid   { color: #3fb950; }
        .name-status.invalid { color: #f85149; }

        .section-label {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 8px;
          display: block;
          color: var(--text-primary);
        }
      `}</style>

      <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28, paddingBottom: 48 }}>

        {/* Header */}
        <div className="cr-section">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), #1a7fd4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Create a new repository</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            A repository contains all project files, including the revision history. Already have a project? <span style={{ color: "var(--accent)", cursor: "pointer" }}>Import it.</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(248,81,73,0.08)", border: "1.5px solid rgba(248,81,73,0.4)", borderRadius: 10, padding: "12px 16px", color: "#f85149", fontSize: 13, animation: "fadeUp 0.2s ease" }}>
            ⚠ {error}
          </div>
        )}

        {/* Owner / Name */}
        <div className="cr-section">
          <label className="section-label">
            Owner / Repository name <span style={{ color: "#f85149" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ padding: "10px 14px", background: "var(--bg-secondary)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {username}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 22, fontWeight: 300 }}>/</span>
            <input
              className="cr-input"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="my-awesome-project"
              required
              style={{ flex: 1 }}
            />
          </div>
          {form.name && (
            <div className="name-status valid" style={nameValid === false ? { color: "#f85149" } : {}}>
              {nameValid === true && <><Check size={12} /> Available</>}
              {nameValid === false && <>✗ Invalid characters</>}
            </div>
          )}
          {form.name && nameValid && (
            <div className="url-preview">
              gitcode.app/<span>{username}</span>/<span>{form.name}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="cr-section">
          <label className="section-label">Description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
          <input
            className="cr-input"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description of your project"
          />
        </div>

        {/* Visibility */}
        <div className="cr-section">
          <label className="section-label">Visibility</label>
          <div style={{ display: "flex", gap: 12 }}>
            <label
              className={`vis-card ${!form.isPrivate ? "selected-public" : ""}`}
              onClick={() => set("isPrivate", false)}
            >
              <div className={`vis-radio ${!form.isPrivate ? "checked-public" : ""}`}>
                {!form.isPrivate && <div className="vis-radio-dot" />}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 4 }}>
                  <Globe size={15} color="#3fb950" /> Public
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Anyone on the internet can see this repository. You choose who can commit.
                </div>
              </div>
            </label>
            <label
              className={`vis-card ${form.isPrivate ? "selected-private" : ""}`}
              onClick={() => set("isPrivate", true)}
            >
              <div className={`vis-radio ${form.isPrivate ? "checked-private" : ""}`}>
                {form.isPrivate && <div className="vis-radio-dot" />}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 4 }}>
                  <Lock size={15} color="#f85149" /> Private
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  You choose who can see and commit to this repository.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Initialize */}
        <div className="cr-section">
          <label className="section-label">Initialize this repository with</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label
              className={`init-row ${form.initReadme ? "active" : ""}`}
              onClick={() => set("initReadme", !form.initReadme)}
            >
              <div className={`custom-check ${form.initReadme ? "checked" : ""}`}>
                {form.initReadme && <Check size={12} color="white" strokeWidth={3} style={{ animation: "checkPop 0.2s ease" }} />}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, marginBottom: 2 }}>
                  <FileText size={14} color="var(--text-muted)" /> Add a README file
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  This is where you can write a long description for your project.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* License + Branch */}
        <div className="cr-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="section-label">License</label>
            <select
              className="cr-input"
              value={form.license}
              onChange={(e) => set("license", e.target.value)}
            >
              <option value="">None</option>
              <option value="MIT">MIT License</option>
              <option value="Apache-2.0">Apache License 2.0</option>
              <option value="GPL-3.0">GPL v3</option>
              <option value="BSD-2-Clause">BSD 2-Clause</option>
            </select>
          </div>
          <div>
            <label className="section-label">Default branch</label>
            <div style={{ position: "relative" }}>
              <GitBranch size={15} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="cr-input"
                value={form.defaultBranch}
                onChange={(e) => set("defaultBranch", e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="cr-section" style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <button type="submit" className="btn-create" disabled={loading || !form.name || nameValid === false}>
            {loading ? (
              <><div className="spinner" /> Creating…</>
            ) : (
              <><Sparkles size={15} /> Create repository <ArrowRight size={15} /></>
            )}
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {form.isPrivate ? "🔒 Private" : "🌐 Public"} · {form.defaultBranch}
            {form.initReadme ? " · README" : ""}
            {form.license ? ` · ${form.license}` : ""}
          </span>
        </div>

      </form>
    </>
  );
}
