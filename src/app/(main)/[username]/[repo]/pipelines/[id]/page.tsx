import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string; id: string }> };

export const metadata: Metadata = { title: "Pipeline" };

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "#3fb950", failed: "#f85149", running: "#58a6ff",
    pending: "#d29922", canceled: "#7d8590",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors[status] || "#7d8590" }} />
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

export default async function PipelineDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName, id } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();

  const pipeline = await db.pipeline.findFirst({
    where: { id, repoId: repo.id },
    include: {
      jobs: { orderBy: { startedAt: "asc" } },
      trigger: { select: { username: true, avatarUrl: true } },
    },
  });
  if (!pipeline) notFound();

  const stages = [...new Set(pipeline.jobs.map((j: any) => j.stage as string))] as string[];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Pipeline <span style={{ color: "var(--text-muted)" }}>#{id.slice(-8)}</span>
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 16 }}>
              <StatusDot status={pipeline.status} />
              <span>Branch: <code style={{ fontFamily: "monospace" }}>{pipeline.branch}</code></span>
              {pipeline.commitSha && <span>Commit: <code style={{ fontFamily: "monospace" }}>{pipeline.commitSha.slice(0, 7)}</code></span>}
              <span>Triggered {timeAgo(pipeline.createdAt.toISOString())}</span>
              {pipeline.trigger && <span>by <strong>{pipeline.trigger.username}</strong></span>}
            </div>
          </div>
          {pipeline.duration > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{pipeline.duration}s</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>duration</div>
            </div>
          )}
        </div>
      </div>

      {/* Stage graph */}
      {stages.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Stages</h2>
          <div style={{ display: "flex", gap: 0, alignItems: "flex-start", overflowX: "auto" }}>
            {stages.map((stage, si) => {
              const stageJobs = pipeline.jobs.filter((j: any) => j.stage === stage);
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ minWidth: 180, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{stage}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {stageJobs.map((job: any) => {
                        const colors: Record<string, string> = { success: "#3fb950", failed: "#f85149", running: "#58a6ff", pending: "#7d8590", canceled: "#7d8590" };
                        return (
                          <div key={job.id} style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: `1px solid ${colors[job.status] || "var(--border)"}44`, borderRadius: 6, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[job.status] || "#7d8590", flexShrink: 0 }} />
                              <strong>{job.name}</strong>
                            </div>
                            {job.duration > 0 && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{job.duration}s</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {si < stages.length - 1 && (
                    <div style={{ width: 32, height: 2, background: "var(--border)", flexShrink: 0, marginBottom: 8 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job logs */}
      {pipeline.jobs.map((job: any) => (
        <div key={job.id} className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ({ success: "#3fb950", failed: "#f85149", running: "#58a6ff", pending: "#d29922", canceled: "#7d8590" } as Record<string, string>)[job.status] || "#7d8590" }} />
              <strong style={{ fontSize: 14 }}>{job.name}</strong>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({job.stage})</span>
            </div>
            {job.duration > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{job.duration}s</span>}
          </div>
          {job.logs && (
            <pre style={{ margin: 0, padding: 16, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#0d1117", color: "#e6edf3", overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
              {job.logs}
            </pre>
          )}
          {!job.logs && (
            <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
              {job.status === "pending" ? "Waiting to run…" : job.status === "running" ? "Running…" : "No output"}
            </div>
          )}
        </div>
      ))}

      {pipeline.jobs.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          Pipeline is being set up…
        </div>
      )}
    </div>
  );
}
