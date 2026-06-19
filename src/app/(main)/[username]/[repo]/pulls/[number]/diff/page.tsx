"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Minus, FileDiff, ChevronDown, ChevronRight } from "lucide-react";
import PRTabNav from "@/components/repo/PRTabNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiffLine = {
  type: "add" | "remove" | "context";
  content: string;
  oldLine: number | null;
  newLine: number | null;
};

type DiffHunk = {
  header: string;
  lines: DiffLine[];
};

type DiffFile = {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
};

type DiffResult = {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
};

type InlineComment = {
  id: string;
  body: string;
  path: string;
  lineRef: string | null;
  side: string | null;
  createdAt: string;
  author: { username: string; name: string | null; avatarUrl: string | null };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lineKey(filePath: string, type: string, lineNum: number | string) {
  return `${filePath}:${type}:${lineNum}`;
}

// ─── InlineCommentCard ────────────────────────────────────────────────────────

function InlineCommentCard({ comment }: { comment: InlineComment }) {
  const avatar =
    comment.author.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`;
  return (
    <div
      style={{
        margin: "4px 0",
        padding: "10px 14px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 6,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <img
        src={avatar}
        alt=""
        style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: "1px solid var(--border)" }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
          {comment.author.username}
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {comment.body}
        </pre>
      </div>
    </div>
  );
}

// ─── InlineCommentBox ─────────────────────────────────────────────────────────

function InlineCommentBox({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(body);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        margin: "4px 0",
        padding: 12,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment on this line…"
          rows={3}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            style={{
              padding: "6px 12px",
              background: "var(--accent)",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: submitting || !body.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? "Saving…" : "Add comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── FileBlock ────────────────────────────────────────────────────────────────

function FileBlock({
  file,
  inlineComments,
  onAddComment,
}: {
  file: DiffFile;
  inlineComments: InlineComment[];
  onAddComment: (path: string, lineRef: string, side: string, body: string) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const displayPath = file.newPath !== "/dev/null" ? file.newPath : file.oldPath;

  // Build map of anchor key → comments
  const commentsByKey: Record<string, InlineComment[]> = {};
  for (const c of inlineComments) {
    if (c.lineRef) {
      const k = lineKey(c.path, c.side ?? "new", c.lineRef);
      if (!commentsByKey[k]) commentsByKey[k] = [];
      commentsByKey[k].push(c);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      {/* File header */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "var(--bg-secondary)",
          borderBottom: collapsed ? "none" : "1px solid var(--border)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <FileDiff size={14} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontFamily: "monospace", fontSize: 13, flex: 1 }}>{displayPath}</span>
        <span style={{ display: "inline-flex", gap: 4, fontSize: 12, fontFamily: "monospace" }}>
          <span style={{ color: "#3fb950" }}>+{file.additions}</span>
          <span style={{ color: "#f85149" }}>-{file.deletions}</span>
        </span>
      </div>

      {!collapsed && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 44 }} />
              <col />
            </colgroup>
            <tbody>
              {file.hunks.map((hunk, hi) => {
                const rows: React.ReactNode[] = [];

                // Hunk header
                rows.push(
                  <tr key={`h-${hi}`}>
                    <td
                      colSpan={3}
                      style={{
                        padding: "3px 10px",
                        background: "rgba(56,139,253,0.10)",
                        color: "#58a6ff",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {hunk.header}
                    </td>
                  </tr>
                );

                hunk.lines.forEach((line, li) => {
                  const sideStr = line.type === "add" ? "new" : line.type === "remove" ? "old" : "new";
                  const lineNum = line.type === "remove" ? line.oldLine : line.newLine;
                  const lineNumStr = String(lineNum ?? li);
                  const key = lineKey(displayPath, sideStr, lineNumStr);
                  const existingComments = commentsByKey[key] ?? [];
                  const isActive = activeKey === key;

                  let bg = "transparent";
                  if (line.type === "add") bg = "rgba(46,160,67,0.15)";
                  else if (line.type === "remove") bg = "rgba(248,81,73,0.15)";

                  const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

                  rows.push(
                    <tr
                      key={key}
                      style={{ background: bg, cursor: "pointer" }}
                      title="Click to add inline comment"
                      onClick={() => setActiveKey((prev) => (prev === key ? null : key))}
                    >
                      <td
                        style={{
                          width: 44,
                          minWidth: 44,
                          textAlign: "right",
                          padding: "1px 8px 1px 4px",
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          userSelect: "none",
                          borderRight: "1px solid var(--border)",
                        }}
                      >
                        {line.type !== "add" ? (line.oldLine ?? "") : ""}
                      </td>
                      <td
                        style={{
                          width: 44,
                          minWidth: 44,
                          textAlign: "right",
                          padding: "1px 8px 1px 4px",
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          userSelect: "none",
                          borderRight: "1px solid var(--border)",
                        }}
                      >
                        {line.type !== "remove" ? (line.newLine ?? "") : ""}
                      </td>
                      <td
                        style={{
                          padding: "1px 10px",
                          fontFamily: "monospace",
                          fontSize: 12,
                          whiteSpace: "pre",
                        }}
                      >
                        <span
                          style={{
                            color:
                              line.type === "add"
                                ? "#3fb950"
                                : line.type === "remove"
                                ? "#f85149"
                                : "var(--text-muted)",
                            userSelect: "none",
                            marginRight: 8,
                          }}
                        >
                          {prefix}
                        </span>
                        {line.content}
                      </td>
                    </tr>
                  );

                  if (existingComments.length > 0) {
                    rows.push(
                      <tr key={`ec-${key}`}>
                        <td colSpan={3} style={{ padding: "0 12px 4px 12px" }}>
                          {existingComments.map((c) => (
                            <InlineCommentCard key={c.id} comment={c} />
                          ))}
                        </td>
                      </tr>
                    );
                  }

                  if (isActive) {
                    rows.push(
                      <tr key={`box-${key}`}>
                        <td colSpan={3} style={{ padding: "0 12px 4px 12px" }}>
                          <InlineCommentBox
                            onSubmit={async (body) => {
                              await onAddComment(displayPath, lineNumStr, sideStr, body);
                              setActiveKey(null);
                            }}
                            onCancel={() => setActiveKey(null)}
                          />
                        </td>
                      </tr>
                    );
                  }
                });

                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PRDiffPage() {
  const params = useParams<{ username: string; repo: string; number: string }>();
  const { username, repo, number } = params;

  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/repos/${username}/${repo}/pulls/${number}`;

  const fetchComments = useCallback(async () => {
    const res = await fetch(`${baseUrl}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments((data.comments as InlineComment[]).filter((c) => c.path));
    }
  }, [baseUrl]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [diffRes, commentsRes] = await Promise.all([
          fetch(`${baseUrl}/diff`),
          fetch(`${baseUrl}/comments`),
        ]);

        if (!diffRes.ok) {
          const e = await diffRes.json().catch(() => ({ error: "Failed to load diff" }));
          throw new Error(e.error ?? "Failed to load diff");
        }

        const diffData: DiffResult = await diffRes.json();
        setDiff(diffData);

        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setComments((data.comments as InlineComment[]).filter((c) => c.path));
        }
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [baseUrl]);

  async function handleAddComment(path: string, lineRef: string, side: string, body: string) {
    const res = await fetch(`${baseUrl}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, path, lineRef, side }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Failed to post comment");
    }
    await fetchComments();
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PRTabNav username={username} repo={repo} number={number} activePath="diff" />

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Computing diff…
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 20, color: "#f85149", textAlign: "center" }}>
          {error}
        </div>
      )}

      {diff && !loading && (
        <>
          {/* Summary bar */}
          <div
            className="card"
            style={{
              padding: "10px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {diff.files.length} file{diff.files.length !== 1 ? "s" : ""} changed
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3fb950" }}>
              <Plus size={13} />
              {diff.totalAdditions} addition{diff.totalAdditions !== 1 ? "s" : ""}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#f85149" }}>
              <Minus size={13} />
              {diff.totalDeletions} deletion{diff.totalDeletions !== 1 ? "s" : ""}
            </span>
          </div>

          {diff.files.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              No differences between these branches.
            </div>
          )}

          {diff.files.map((file, i) => {
            const path = file.newPath !== "/dev/null" ? file.newPath : file.oldPath;
            const fileComments = comments.filter((c) => c.path === path);
            return (
              <FileBlock
                key={i}
                file={file}
                inlineComments={fileComments}
                onAddComment={handleAddComment}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
