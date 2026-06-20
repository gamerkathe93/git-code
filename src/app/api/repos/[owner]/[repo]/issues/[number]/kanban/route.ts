import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_COLUMNS = ["backlog", "todo", "in_progress", "in_review", "done"];

type Params = { params: Promise<{ owner: string; repo: string; number: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, number } = await params;
  const { column } = await req.json();

  if (!VALID_COLUMNS.includes(column)) {
    return NextResponse.json({ error: "Invalid column" }, { status: 400 });
  }

  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const issue = await db.issue.findUnique({
    where: { repoId_number: { repoId: repo.id, number: parseInt(number) } },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await (db as any).issue.update({
    where: { id: issue.id },
    data: { kanbanColumn: column },
  });

  return NextResponse.json(updated);
}
