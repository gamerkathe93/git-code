import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string }> };

async function getRepo(owner: string, repoName: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return null;
  return db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  const webhooks = await db.webhook.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });

  const result = webhooks.map((w) => ({
    ...w,
    events: JSON.parse(w.events || "[]") as string[],
  }));

  return NextResponse.json({ webhooks: result });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const repo = await getRepo(owner, repoName);
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  const body = await req.json();
  const { url, secret = "", events = [] } = body;

  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const webhook = await db.webhook.create({
    data: {
      repoId: repo.id,
      url,
      secret,
      events: JSON.stringify(events),
      isActive: true,
    },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { webhook: { ...webhook, events: JSON.parse(webhook.events || "[]") } },
    { status: 201 }
  );
}
