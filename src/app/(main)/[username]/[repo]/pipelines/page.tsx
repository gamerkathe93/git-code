import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Play } from "lucide-react";
import RunPipelineButton from "@/components/pipeline/RunPipelineButton";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

type Params = { params: Promise<{ username: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, repo } = await params;
  return { title: `Pipelines · ${username}/${repo}` };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "badge-success", failed: "badge-failed", running: "badge-running",
    pending: "badge-pending", canceled: "badge-canceled",
  };
  const dots: Record<string, string> = {
    success: "#3fb950", failed: "#f85149", running: "#58a6ff",
    pending: "#d29922", canceled: "#7d8590",
  };
  return (
    <span className={`badge ${map[status] || ""}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dots[status] || "#7d8590" }} />
      {status}
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
    take: 25,
    include: {
      jobs: { select: { id: true, name: true, stage: true, status: true } },
      trigger: { select: { username: true, avatarUrl: true } },
    },
  });

  const [total, success, failed, running] = await Promise.all([
    db.pipeline.count({ where: { repoId: repo.id } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "success" } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "failed" } }),
    db.pipeline.count({ where: { repoId: repo.id, status: "running" } }),
  ]);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", value: total, color: "var(--text)" },
          { label: "Success", value: success, color: "#3fb950" },
          { label: "Failed", value: failed, color: "#f85149" },
          { label: "Running", value: running, color: "#58a6ff" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>All pipelines</span>
          {session.username === username && (
            <RunPipelineButton username={username} repo={repoName} branch={repo.defaultBranch} />
          )}
        </div>

        {pipelines.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <Play size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ marginBottom: 8 }}>No pipelines yet.</p>
            <p style={{ fontSize: 13 }}>Add a <code>.gitcode.yml</code> to your repo and push to trigger one.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Status", "Pipeline", "Branch", "Commit", "Stages", "Duration", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipelines.map((p: any) => {
                const stages = [...new Set(p.jobs.map((j: any) => j.stage as string))] as string[];
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/${username}/${repoName}/pipelines/${p.id}`} style={{ fontWeight: 600 }}>
                        #{p.id.slice(-6)}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <code style={{ fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" }}>{p.branch}</code>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                      {p.commitSha ? p.commitSha.slice(0, 7) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {stages.map((stage) => {
                          const stageJobs = p.jobs.filter((j: any) => j.stage === stage);
                          const stageStatus = stageJobs.every((j: any) => j.status === "success") ? "success"
                            : stageJobs.some((j: any) => j.status === "failed") ? "failed"
                            : stageJobs.some((j: any) => j.status === "running") ? "running" : "pending";
                          const colors: Record<string, string> = { success: "#3fb950", failed: "#f85149", running: "#58a6ff", pending: "#7d8590" };
                          return (
                            <span key={stage} style={{ fontSize: 10, background: colors[stageStatus] + "22", color: colors[stageStatus], border: `1px solid ${colors[stageStatus]}44`, borderRadius: 4, padding: "2px 6px" }}>
                              {stage}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                      {p.duration > 0 ? `${p.duration}s` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
                      {timeAgo(p.createdAt.toISOString())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
