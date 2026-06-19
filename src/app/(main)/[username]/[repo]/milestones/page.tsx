import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import MilestonesClient from "@/components/milestones/MilestonesClient";

type Params = {
  params: Promise<{ username: string; repo: string }>;
  searchParams: Promise<{ state?: string }>;
};

export default async function MilestonesPage({ params, searchParams }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;
  const { state: stateParam } = await searchParams;
  const activeState = stateParam === "closed" ? "closed" : "open";

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const milestones = await db.milestone.findMany({
    where: { repoId: repo.id, state: activeState },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { issues: true } },
      issues: { select: { state: true } },
    },
  });

  const serialized = milestones.map((m) => {
    const total = m._count.issues;
    const closed = m.issues.filter((i) => i.state === "closed").length;
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      state: m.state,
      closedAt: m.closedAt ? m.closedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      repoId: m.repoId,
      totalIssues: total,
      closedIssues: closed,
    };
  });

  const isOwner = session.username === username;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <MilestonesClient
        milestones={serialized}
        owner={username}
        repo={repoName}
        isOwner={isOwner}
        activeState={activeState}
      />
    </div>
  );
}
