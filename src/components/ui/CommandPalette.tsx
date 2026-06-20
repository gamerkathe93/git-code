"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Home, GitBranch, CircleDot, GitPullRequestArrow,
  Workflow, Settings2, Plus, FolderGit2, X, ArrowRight,
  BookText, BarChart2, Users
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string;
}

interface Props {
  username?: string;
  currentRepo?: string;
  currentOwner?: string;
  repos?: { name: string; owner: string }[];
}

export default function CommandPalette({ username, currentRepo, currentOwner, repos = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function navigate(path: string) {
    router.push(path);
    close();
  }

  // Build command list
  const commands: Command[] = [
    // Global nav
    { id: "home", label: "Go to dashboard", icon: <Home size={15} />, action: () => navigate("/dashboard"), group: "Navigation", keywords: "home dashboard" },
    { id: "explore", label: "Explore repositories", icon: <FolderGit2 size={15} />, action: () => navigate("/explore"), group: "Navigation", keywords: "explore discover" },
    ...(username ? [
      { id: "profile", label: `Your profile (${username})`, icon: <Users size={15} />, action: () => navigate(`/${username}`), group: "Navigation", keywords: "profile me" },
      { id: "settings", label: "Settings", icon: <Settings2 size={15} />, action: () => navigate("/settings"), group: "Navigation", keywords: "settings account" },
      { id: "tokens", label: "Personal access tokens", icon: <Settings2 size={15} />, action: () => navigate("/settings/tokens"), group: "Navigation", keywords: "token api key" },
    ] : []),

    // Current repo commands
    ...(currentOwner && currentRepo ? [
      { id: "repo-code", label: `${currentOwner}/${currentRepo} — Code`, icon: <FolderGit2 size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}`), group: "Current repo", keywords: "code files" },
      { id: "repo-issues", label: `${currentOwner}/${currentRepo} — Issues`, icon: <CircleDot size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/issues`), group: "Current repo" },
      { id: "repo-pulls", label: `${currentOwner}/${currentRepo} — Pull requests`, icon: <GitPullRequestArrow size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/pulls`), group: "Current repo" },
      { id: "repo-pipelines", label: `${currentOwner}/${currentRepo} — Pipelines`, icon: <Workflow size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/pipelines`), group: "Current repo" },
      { id: "repo-insights", label: `${currentOwner}/${currentRepo} — Insights`, icon: <BarChart2 size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/insights`), group: "Current repo" },
      { id: "repo-wiki", label: `${currentOwner}/${currentRepo} — Wiki`, icon: <BookText size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/wiki`), group: "Current repo" },
      { id: "repo-search", label: `Search in ${currentOwner}/${currentRepo}`, icon: <Search size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/search`), group: "Current repo" },
      { id: "repo-settings", label: `${currentOwner}/${currentRepo} — Settings`, icon: <Settings2 size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/settings`), group: "Current repo" },
      { id: "new-issue", label: `New issue in ${currentOwner}/${currentRepo}`, icon: <Plus size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/issues/new`), group: "Actions" },
      { id: "new-pr", label: `New pull request in ${currentOwner}/${currentRepo}`, icon: <GitBranch size={15} />, action: () => navigate(`/${currentOwner}/${currentRepo}/pulls/new`), group: "Actions" },
    ] : []),

    // All repos
    ...repos.slice(0, 10).map(r => ({
      id: `repo-${r.owner}-${r.name}`,
      label: `${r.owner}/${r.name}`,
      icon: <FolderGit2 size={15} />,
      action: () => navigate(`/${r.owner}/${r.name}`),
      group: "Your repositories",
      keywords: r.name,
    })),
  ];

  // Filter
  const q = query.toLowerCase().trim();
  const filtered = q
    ? commands.filter(c =>
        c.label.toLowerCase().includes(q) ||
        (c.sublabel || "").toLowerCase().includes(q) ||
        (c.keywords || "").toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      )
    : commands.slice(0, 12);

  // Group them
  const grouped: Record<string, Command[]> = {};
  filtered.forEach(c => {
    if (!grouped[c.group]) grouped[c.group] = [];
    grouped[c.group].push(c);
  });

  const flat = Object.values(grouped).flat();

  useEffect(() => setSelected(0), [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && flat[selected]) { flat[selected].action(); }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 10px", borderRadius: 8,
        border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)",
        color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
        transition: "all 0.15s",
      }}
      title="Command palette (⌘K)"
    >
      <Search size={13} />
      <span style={{ display: "inline" }}>Search or jump to…</span>
      <kbd style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>⌘K</kbd>
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, backdropFilter: "blur(2px)" }}
      />
      {/* Palette */}
      <div style={{
        position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: "min(600px, 92vw)", zIndex: 1001,
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands, repos, pages…"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text)", fontSize: 15, fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}>
              <X size={14} />
            </button>
          )}
          <kbd onClick={close} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", cursor: "pointer" }}>Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: "auto", padding: "6px 0" }}>
          {flat.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 16px 4px" }}>
                  {group}
                </div>
                {cmds.map(cmd => {
                  const idx = flat.indexOf(cmd);
                  const isSelected = idx === selected;
                  return (
                    <div
                      key={cmd.id}
                      data-idx={idx}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelected(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 16px", cursor: "pointer",
                        background: isSelected ? "rgba(255,255,255,0.06)" : "none",
                        transition: "background 0.1s",
                      }}
                    >
                      <span style={{ color: isSelected ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}>
                        {cmd.icon}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{cmd.label}</span>
                      {isSelected && <ArrowRight size={12} color="var(--text-muted)" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </>
  );
}
