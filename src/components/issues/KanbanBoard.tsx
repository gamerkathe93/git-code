"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";

interface Issue {
  id: string;
  number: number;
  title: string;
  state: string;
  kanbanColumn: string;
  author: { username: string; avatarUrl: string };
  labels: { label: { name: string; color: string } }[];
  _count: { comments: number };
}

interface Column {
  id: string;
  label: string;
  color: string;
  accent: string;
}

const COLUMNS: Column[] = [
  { id: "backlog",     label: "Backlog",     color: "rgba(255,255,255,0.04)", accent: "#6e7681" },
  { id: "todo",        label: "To do",       color: "rgba(59,130,246,0.08)",  accent: "#60a5fa" },
  { id: "in_progress", label: "In progress", color: "rgba(234,179,8,0.08)",   accent: "#eab308" },
  { id: "in_review",   label: "In review",   color: "rgba(167,139,250,0.08)", accent: "#a78bfa" },
  { id: "done",        label: "Done",        color: "rgba(34,197,94,0.08)",   accent: "#22c55e" },
];

export default function KanbanBoard({
  issues: initialIssues,
  owner,
  repo,
}: {
  issues: Issue[];
  owner: string;
  repo: string;
}) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragIssueId = useRef<string | null>(null);

  function getColumnIssues(colId: string) {
    return issues.filter(i => (i.kanbanColumn || "backlog") === colId);
  }

  function onDragStart(e: React.DragEvent, issueId: string) {
    dragIssueId.current = issueId;
    setDragging(issueId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(colId);
  }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    const id = dragIssueId.current;
    if (!id) return;

    const issue = issues.find(i => i.id === id);
    if (!issue || issue.kanbanColumn === colId) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    // Optimistic update
    setIssues(prev => prev.map(i => i.id === id ? { ...i, kanbanColumn: colId } : i));
    setDragging(null);
    setDragOver(null);
    dragIssueId.current = null;

    // Persist
    try {
      await fetch(`/api/repos/${owner}/${repo}/issues/${issue.number}/kanban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: colId }),
      });
    } catch {
      // Revert on failure
      setIssues(prev => prev.map(i => i.id === id ? { ...i, kanbanColumn: issue.kanbanColumn } : i));
    }
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: 12,
      overflowX: "auto",
      paddingBottom: 8,
    }}>
      {COLUMNS.map(col => {
        const colIssues = getColumnIssues(col.id);
        const isOver = dragOver === col.id;

        return (
          <div
            key={col.id}
            onDragOver={e => onDragOver(e, col.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, col.id)}
            style={{
              minHeight: 400,
              borderRadius: 10,
              background: isOver ? `${col.accent}15` : col.color,
              border: `1px solid ${isOver ? col.accent + "60" : "var(--border)"}`,
              padding: 10,
              transition: "all 0.15s",
            }}
          >
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "0 2px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flex: 1 }}>{col.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "0 6px", minWidth: 18, textAlign: "center" }}>
                {colIssues.length}
              </span>
            </div>

            {/* Issue cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {colIssues.map(issue => (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={e => onDragStart(e, issue.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${dragging === issue.id ? col.accent + "80" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: "10px 10px 8px",
                    cursor: "grab",
                    opacity: dragging === issue.id ? 0.5 : 1,
                    transition: "opacity 0.1s, border-color 0.1s",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <GripVertical size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <Link
                      href={`/${owner}/${repo}/issues/${issue.number}`}
                      style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", lineHeight: 1.4, textDecoration: "none" }}
                      onClick={e => e.stopPropagation()}
                      draggable={false}
                    >
                      {issue.title}
                    </Link>
                  </div>

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6, marginLeft: 18 }}>
                      {issue.labels.slice(0, 2).map((il: any) => (
                        <span key={il.label.name} style={{
                          fontSize: 10, padding: "1px 5px", borderRadius: 8,
                          background: `${il.label.color}22`, color: il.label.color,
                          border: `1px solid ${il.label.color}44`,
                        }}>
                          {il.label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 18 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>#{issue.number}</span>
                    <img
                      src={issue.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${issue.author.username}`}
                      alt=""
                      style={{ width: 14, height: 14, borderRadius: "50%", marginLeft: "auto" }}
                      draggable={false}
                    />
                    {issue._count.comments > 0 && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>💬{issue._count.comments}</span>
                    )}
                  </div>
                </div>
              ))}

              {colIssues.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12, opacity: 0.5 }}>
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
