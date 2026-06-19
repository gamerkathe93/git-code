import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Play, GitBranch, Clock, CheckCircle, XCircle, Loader, Zap } from "lucide-react";
import RunPipelineButton from "@/components/pipeline/RunPipelineButton";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Pipelines · ${username}/${repo}` };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; glow: string; label: string }> = {
  success:  { color: "#3fb950", bg: "rgba(63,185,80,0.1)",   glow: "rgba(63,185,80,0.3)",   label: "Passed" },
  failed:   { color: "#f85149", bg: "rgba(248,81,73,0.1)",   glow: "rgba(248,81,73,0.3)",   label: "Failed" },
  running:  { color: "#58a6ff", bg: "rgba(88,166,255,0.1)",  glow: "rgba(88,166,255,0.3)",  label: "Running" },
  pending:  { color: "#d29922", bg: "rgba(210,153,34,0.1)",  glow: "rgba(210,153,34,0.3)",  label: "Pending" },
  canceled: { color: "#7d8590", bg: "rgba(125,133,144,0.1)", glow: "rgba(125,133,144,0.3)", label: "Canceled" },
};

function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.canceled;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>
      {status === "running" && (
        <span style={{
          position: "absolute", inset: -4,
          borderRadius: "50%",
          background: cfg.color,
          opacity: 0.3,
          animation: "pipPulse 1.5s ease-in-out infinite",
        }} />
      )}
      <span style={{ width: size, height: size, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
    </span>
  );
}

export default async function PipelinesPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const pipelines = await db.pipeline.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      jobs: { select: { id: true, name: true, stage: true, status: true, duration: true } },
      trigger: { select: { username: true } },
    },
  });

  const [total, success, failed, running] = await Promise.all([
    db.pipeline.count({ where: { repoId: repo.id } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "success" } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "failed" } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "running" } }),
  ]);

  const stats = [
    { label: "Total runs",   value: total,   color: "#c9d1d9", icon: Zap,         bg: "rgba(201,209,217,0.08)" },
    { label: "Passed",       value: success,  color: "#3fb950", icon: CheckCircle, bg: "rgba(63,185,80,0.08)" },
    { label: "Failed",       value: failed,   color: "#f85149", icon: XCircle,     bg: "rgba(248,81,73,0.08)" },
    { label: "Running",      value: running,  color: "#58a6ff", icon: Loader,      bg: "rgba(88,166,255,0.08)" },
  ];

  return (
    <>
      <style>{`
        @keyframes pipFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pipPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%       { transform: scale(2.2); opacity: 0; }
        }
        @keyframes pipSpin { to { transform: rotate(360deg); } }
        @keyframes pipSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .pip-stat {
          animation: pipFadeUp 0.4s ease both;
        }
        .pip-stat:nth-child(1) { animation-delay: 0ms; }
        .pip-stat:nth-child(2) { animation-delay: 60ms; }
        .pip-stat:nth-child(3) { animation-delay: 120ms; }
        .pip-stat:nth-child(4) { animation-delay: 180ms; }
        .pip-row {
          animation: pipSlideIn 0.35s ease both;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .pip-row:hover { background: var(--bg-secondary); }
        .pip-row:nth-child(1)  { animation-delay: 50ms; }
        .pip-row:nth-child(2)  { animation-delay: 80ms; }
        .pip-row:nth-child(3)  { animation-delay: 110ms; }
        .pip-row:nth-child(4)  { animation-delay: 140ms; }
        .pip-row:nth-child(5)  { animation-delay: 170ms; }
        .pip-row:nth-child(n+6){ animation-delay: 200ms; }
        .pip-link {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          transition: color 0.15s;
        }
        .pip-link:hover { color: var(--accent); }
        .pip-stage-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .pip-spin { animation: pipSpin 1s linear infinite; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="pip-stat card" style={{ padding: 20, background: s.bg, borderColor: s.color + "33" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={s.color} className={s.label === "Running" && running > 0 ? "pip-spin" : ""} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Pipeline list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Pipeline runs</span>
            {session.username === username && (
              <RunPipelineButton username={username} repo={repoName} branch={repo.defaultBranch} />
            )}
          </div>

          {pipelines.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Play size={28} color="var(--text-muted)" />
              </div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No pipelines yet</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320, margin: "0 auto" }}>
                Add a <code style={{ background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4 }}>.gitcode.yml</code> file to your repository and push to trigger your first pipeline.
              </p>
            </div>
          ) : (
            <div>
              {pipelines.map((p: any) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.canceled;
                const stages = [...new Set(p.jobs.map((j: any) => j.stage as string))] as string[];

                return (
                  <div key={p.id} className="pip-row" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Status */}
                    <div style={{ flexShrink: 0 }}>
                      <StatusDot status={p.status} size={10} />
                    </div>

                    {/* ID + info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Link href={`/${username}/${repoName}/pipelines/${p.id}`} className="pip-link">
                          #{p.id.slice(-6)}
                        </Link>
                        <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 999, background: cfg.bg, color: cfg.color, fontWeight: 600, border: `1px solid ${cfg.color}33` }}>
                          {cfg.label}
                        </span>
                        {p.commitMsg && (
                          <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                            {p.commitMsg}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <GitBranch size={11} /> {p.branch}
                        </span>
                        {p.commitSha && (
                          <code style={{ fontSize: 11, background: "var(--bg-secondary)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                            {p.commitSha.slice(0, 7)}
                          </code>
                        )}
                        {p.trigger && <span>by <strong>{p.trigger.username}</strong></span>}
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> {timeAgo(p.createdAt.toISOString())}
                        </span>
                      </div>
                    </div>

                    {/* Stage pills */}
                    {stages.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {stages.map((stage, si) => {
                          const stageJobs = p.jobs.filter((j: any) => j.stage === stage);
                          const st = stageJobs.every((j: any) => j.status === "success") ? "success"
                            : stageJobs.some((j: any) => j.status === "failed") ? "failed"
                            : stageJobs.some((j: any) => j.status === "running") ? "running" : "pending";
                          const sc = STATUS_CONFIG[st] ?? STATUS_CONFIG.canceled;
                          return (
                            <span key={stage} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span className="pip-stage-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}33` }}>
                                <StatusDot status={st} size={6} />
                                {stage}
                              </span>
                              {si < stages.length - 1 && (
                                <span style={{ color: "var(--border)", fontSize: 14 }}>›</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Duration */}
                    <div style={{ flexShrink: 0, textAlign: "right", minWidth: 48 }}>
                      {p.duration > 0 ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                          {p.duration}s
                        </span>
                      ) : p.status === "running" ? (
                        <Loader size={12} color="#58a6ff" className="pip-spin" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
