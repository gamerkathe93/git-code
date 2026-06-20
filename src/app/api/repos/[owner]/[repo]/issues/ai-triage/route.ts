import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  const { issueId } = await req.json();

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const repo = await db.repository.findUnique({ where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } } });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const issue = await (db as any).issue.findUnique({ where: { id: issueId }, include: { labels: { include: { label: true } } } });
  if (!issue || issue.repoId !== repo.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get existing labels for context
  const allLabels = await db.label.findMany({ where: { repoId: repo.id } });
  const labelNames = allLabels.map((l: { name: string }) => l.name).join(", ");

  const result = await callClaude(
    `Triage this issue and suggest labels and priority.\n\nIssue title: "${issue.title}"\nIssue body: "${issue.body?.slice(0, 1000) || "(no description)"}"\n\nAvailable labels: ${labelNames || "bug, enhancement, documentation, question, help wanted"}\n\nRespond in JSON: {"labels": ["label1", "label2"], "priority": "low|medium|high|critical", "summary": "one sentence triage summary"}`,
    "You are an expert software project manager who triages GitHub issues. Return only valid JSON."
  );

  try {
    const parsed = JSON.parse(result.trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ labels: [], priority: "medium", summary: result });
  }
}
