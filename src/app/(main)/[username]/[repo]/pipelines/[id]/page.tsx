"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, GitBranch, Clock, CheckCircle, XCircle,
  Loader, ChevronDown, ChevronRight, Terminal, RefreshCw,
  GitCommit, User, Circle
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  success:  { color: "#3fb950", bg: "rgba(63,185,80,0.08)",  border: "rgba(63,185,80,0.25)",  label: "Passed" },
  failed:   { color: "#f85149", bg: "rgba(248,81,73,0.08)",  border: "rgba(248,81,73,0.25)",  label: "Failed" },
  running:  { color: "#58a6ff", bg: "rgba(88,166,255,0.08)", border: "rgba(88,166,255,0.25)", label: "Running" },
  pending:  { color: "#d29922", bg: "rgba(210,153,34,0.08)", border: "rgba(210,153,34,0.25)", label: "Pending" },
  canceled: { color: "#7d8590", bg: "rgba(125,133,144,0.08)",border: "rgba(125,133,144,0.2)", label: "Canceled" },
};

type PipelineJob = {
  id: string; name: string; stage: string; status: string;
  logs: string | null; duration: number; startedAt: string | null; finishedAt: string | null;
};

type Pipeline = {
  id: string; status: string; branch: string; commitSha: string | null;
  commitMsg: string | null; duration: number; createdAt: string; updatedAt: string;
  trigger?: { username: string } | null;
  jobs: PipelineJob[];
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.canceled;
  if (status === "success") return <CheckCircle size={size} color={cfg.color} />;
  if (status === "failed")  return <XCircle size={size} color={cfg.color} />;
  if (status === "running") return <Loader size={size} color={cfg.color} style={{ animation: "detSpin 1s linear infinite" }} />;
  if (status === "pending") return <Circle size={size} color={cfg.color} />;
  return <Circle size={size} color={cfg.color} />;
}

function StageGraph({ stages, jobs }: { stages: string[]; jobs: PipelineJob[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", padding: "4px 0" }}>
      {stages.map((stage, idx) => {
        const stageJobs = jobs.filter(j => j.stage === stage);
        const st = stageJobs.length === 0 ? "pending"
          : stageJobs.every(j => j.status === "success") ? "success"
          : stageJobs.some(j => j.status === "failed") ? "failed"
          : stageJobs.some(j => j.status === "running") ? "running" : "pending";
        const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.pending;
        return (
          <div key={stage} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {idx > 0 && (
              <div style={{ display: "flex", alignItems: "center", width: 36, flexShrink: 0 }}>
                <div style={{ flex: 1, height: 2, background: st === "pending" ? "var(--border)" : cfg.color + "60", transition: "background 0.5s" }} />
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              </div>
            )}
            <div style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 10,
              padding: "10px 18px",
              minWidth: 100,
              textAlign: "center",
              boxShadow: st === "running" ? `0 0 16px ${cfg.color}40` : undefined,
              animation: st === "running" ? "detPulseGlow 2s ease-in-out infinite" : undefined,
            }}>
              <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}>
                <StatusIcon status={st} size={18} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cfg.color }}>
                {stage}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                {stageJobs.length} job{stageJobs.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogViewer({ logs, isRunning }: { logs: string | null; isRunning: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  const lines = (logs ?? "").split("\n");

  useEffect(() => {
    if (isRunning) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, isRunning]);

  return (
    <div style={{ background: "#0d1117", borderRadius: 8, border: "1px solid rgba(48,54,61,0.8)", overflow: "hidden", marginTop: 8 }}>
      {/* Terminal title bar */}
      <div style={{ padding: "8px 12px", background: "#161b22", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 8, fontSize: 11, color: "#7d8590", display: "flex", alignItems: "center", gap: 4 }}>
          <Terminal size={11} /> output
        </span>
        {isRunning && (
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#58a6ff", display: "flex", alignItems: "center", gap: 4, animation: "detBlink 1s step-end infinite" }}>
            ● LIVE
          </span>
        )}
      </div>
      {/* Log content */}
      <div style={{ padding: 12, overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
        <div style={{ fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace", fontSize: 12, lineHeight: 1.7 }}>
          {lines.length === 0 || (lines.length === 1 && !lines[0]) ? (
            <span style={{ color: "#7d8590" }}>No output yet…</span>
          ) : (
            lines.map((line, i) => {
              const isError = /\b(error|fail|fatal|exception)\b/i.test(line) && !/\b(no error|0 failed)\b/i.test(line);
              const isSuccess = /\b(success|passed|ok|done|complete)\b/i.test(line) || /[✓✔]/.test(line);
              const isCmd = line.trimStart().startsWith("$") || line.trimStart().startsWith("#");
              const color = isError ? "#f85149" : isSuccess ? "#3fb950" : isCmd ? "#58a6ff" : "#c9d1d9";
              return (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <span style={{ color: "#484f58", userSelect: "none", minWidth: 32, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ color, wordBreak: "break-all" }}>{line || " "}</span>
                </div>
              );
            })
          )}
          {isRunning && (
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#484f58", userSelect: "none", minWidth: 32, textAlign: "right" }}>{lines.length + 1}</span>
              <span style={{ color: "#58a6ff", animation: "detBlink 1s step-end infinite" }}>▋</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: PipelineJob }) {
  const [open, setOpen] = useState(job.status === "running" || job.status === "failed");
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.canceled;

  return (
    <div style={{ border: `1px solid ${cfg.border}`, borderRadius: 10, overflow: "hidden", background: cfg.bg, transition: "box-shadow 0.2s", animation: "detFadeUp 0.3s ease both" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <StatusIcon status={job.status} size={16} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{job.name}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600 }}>
          {cfg.label}
        </span>
        {job.duration > 0 && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 40, textAlign: "right" }}>{job.duration}s</span>
        )}
        {open ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", animation: "detSlideDown 0.2s ease" }}>
          <LogViewer logs={job.logs} isRunning={job.status === "running"} />
        </div>
      )}
    </div>
  );
}

export default function PipelineDetailPage() {
  const params = useParams<{ username: string; repo: string; id: string }>();
  const { username, repo, id } = params;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/repos/${username}/${repo}/pipelines/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPipeline(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [username, repo, id]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  // Poll while running
  useEffect(() => {
    if (!pipeline) return;
    if (pollRef.current) clearInterval(pollRef.current);
    if (pipeline.status === "running" || pipeline.status === "pending") {
      pollRef.current = setInterval(fetchPipeline, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pipeline?.status, fetchPipeline]);

  // Elapsed timer
  useEffect(() => {
    if (!pipeline) return;
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (pipeline.status === "running") {
      const start = new Date(pipeline.createdAt).getTime();
      elapsedRef.current = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    } else {
      setElapsed(pipeline.duration ?? 0);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [pipeline?.status, pipeline?.createdAt, pipeline?.duration]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12, color: "var(--text-muted)" }}>
      <style>{`@keyframes detSpin { to { transform: rotate(360deg); } }`}</style>
      <Loader size={22} style={{ animation: "detSpin 1s linear infinite" }} />
      <span>Loading pipeline…</span>
    </div>
  );

  if (error || !pipeline) return (
    <div className="card" style={{ padding: 48, textAlign: "center" }}>
      <p style={{ color: "#f85149", fontWeight: 600, marginBottom: 12 }}>Pipeline not found</p>
      <Link href={`/${username}/${repo}/pipelines`} style={{ color: "var(--accent)", fontSize: 13 }}>← Back to pipelines</Link>
    </div>
  );

  const cfg = STATUS_CONFIG[pipeline.status] ?? STATUS_CONFIG.canceled;
  const stages = [...new Set(pipeline.jobs.map(j => j.stage))];
  const successJobs = pipeline.jobs.filter(j => j.status === "success").length;
  const failedJobs = pipeline.jobs.filter(j => j.status === "failed").length;
  const totalJobs = pipeline.jobs.length;
  const successPct = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 0;

  return (
    <>
      <style>{`
        @keyframes detSpin { to { transform: rotate(360deg); } }
        @keyframes detFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes detSlideDown {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 600px; }
        }
        @keyframes detPulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(88,166,255,0.25); }
          50%       { box-shadow: 0 0 24px rgba(88,166,255,0.55); }
        }
        @keyframes detBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes detProgressFill { from { width: 0; } }
        @keyframes detHeaderIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .det-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); text-decoration: none; padding: 6px 10px; border-radius: 6px; transition: all 0.15s; border: 1px solid transparent; }
        .det-back:hover { color: var(--text-primary); border-color: var(--border); background: var(--bg-secondary); }
        .det-refresh { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: transparent; cursor: pointer; transition: all 0.15s; }
        .det-refresh:hover { color: var(--text-primary); background: var(--bg-secondary); }
        .det-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); padding: 4px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border); }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "detFadeUp 0.35s ease" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href={`/${username}/${repo}/pipelines`} className="det-back">
            <ArrowLeft size={14} /> All pipelines
          </Link>
          <button className="det-refresh" onClick={fetchPipeline}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Header */}
        <div className="card" style={{
          padding: 24, background: cfg.bg, borderColor: cfg.border,
          boxShadow: pipeline.status === "running" ? `0 0 32px ${cfg.color}18` : undefined,
          animation: "detHeaderIn 0.4s ease",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: cfg.color + "18", border: `2px solid ${cfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <StatusIcon status={pipeline.status} size={26} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Pipeline #{id.slice(-6)}</span>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 700 }}>
                  {cfg.label}
                </span>
              </div>
              {pipeline.commitMsg && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.4 }}>{pipeline.commitMsg}</p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="det-chip"><GitBranch size={12} /> {pipeline.branch}</span>
                {pipeline.commitSha && (
                  <span className="det-chip" style={{ fontFamily: "monospace" }}>
                    <GitCommit size={12} /> {pipeline.commitSha.slice(0, 7)}
                  </span>
                )}
                {pipeline.trigger && <span className="det-chip"><User size={12} /> {pipeline.trigger.username}</span>}
                <span className="det-chip"><Clock size={12} /> {timeAgo(pipeline.createdAt)}</span>
                {(elapsed > 0 || pipeline.status === "running") && (
                  <span className="det-chip" style={{ color: pipeline.status === "running" ? "#58a6ff" : undefined }}>
                    ⏱ {elapsed}s {pipeline.status === "running" && "(live)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {totalJobs > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                <span>{successJobs}/{totalJobs} jobs completed{failedJobs > 0 ? ` · ${failedJobs} failed` : ""}</span>
                <span>{successPct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${successPct}%`,
                  background: failedJobs > 0 ? "#f85149" : "#3fb950",
                  transition: "width 0.5s ease",
                  animation: "detProgressFill 0.8s ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Stage graph */}
        {stages.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.07em" }}>Pipeline stages</p>
            <StageGraph stages={stages} jobs={pipeline.jobs} />
          </div>
        )}

        {/* Jobs grouped by stage */}
        {stages.map(stage => {
          const stageJobs = pipeline.jobs.filter(j => j.stage === stage);
          if (!stageJobs.length) return null;
          const st = stageJobs.every(j => j.status === "success") ? "success"
            : stageJobs.some(j => j.status === "failed") ? "failed"
            : stageJobs.some(j => j.status === "running") ? "running" : "pending";
          const sc = STATUS_CONFIG[st] ?? STATUS_CONFIG.pending;
          return (
            <div key={stage}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: sc.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: sc.color }}>{stage}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stageJobs.map((job, ji) => (
                  <div key={job.id} style={{ animationDelay: `${ji * 60}ms` }}>
                    <JobCard job={job} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {pipeline.jobs.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <Loader size={24} color="var(--text-muted)" style={{ margin: "0 auto 12px", display: "block", animation: "detSpin 1s linear infinite" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Jobs are being queued…</p>
          </div>
        )}
      </div>
    </>
  );
}
