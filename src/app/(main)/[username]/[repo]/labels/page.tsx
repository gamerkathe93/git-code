import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import LabelsClient from "@/components/labels/LabelsClient";

type Params = { params: Promise<{ username: string; repo: string }> };

export default async function LabelsPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username, repo: repoName } = await params;

  const ownerUser = await db.user.findUnique({ where: { username } });
  if (!ownerUser) notFound();

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) notFound();
  if (repo.isPrivate && session.username !== username) notFound();

  const labels = await db.label.findMany({
    where: { repoId: repo.id },
    orderBy: { name: "asc" },
  });

  const isOwner = session.username === username;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <LabelsClient
        labels={labels}
        owner={username}
        repo={repoName}
        isOwner={isOwner}
      />
    </div>
  );
}
