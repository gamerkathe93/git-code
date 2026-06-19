import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ owner: string; repo: string; id: string }> };

async function getRepoAndWebhook(owner: string, repoName: string, id: string) {
  const ownerUser = await db.user.findUnique({ where: { username: owner } });
  if (!ownerUser) return { repo: null, webhook: null };

  const repo = await db.repository.findUnique({
    where: { ownerId_name: { ownerId: ownerUser.id, name: repoName } },
  });
  if (!repo) return { repo: null, webhook: null };

  const webhook = await db.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.repoId !== repo.id) return { repo, webhook: null };

  return { repo, webhook };
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { webhook } = await getRepoAndWebhook(owner, repoName, id);
  if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const deliveries = await (db as any).webhookDelivery.findMany({
    where: { webhookId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: JSON.parse(webhook.events || "[]") as string[],
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    },
    deliveries,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { webhook } = await getRepoAndWebhook(owner, repoName, id);
  if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const body = await req.json();
  const { url, secret, events, isActive } = body;

  const updated = await db.webhook.update({
    where: { id },
    data: {
      ...(url !== undefined && { url }),
      ...(secret !== undefined && { secret }),
      ...(events !== undefined && { events: JSON.stringify(events) }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    webhook: { ...updated, events: JSON.parse(updated.events || "[]") },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { owner, repo: repoName, id } = await params;
  if (session.username !== owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { webhook } = await getRepoAndWebhook(owner, repoName, id);
  if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  await db.webhook.delete({ where: { id } });

  return NextResponse.json({ message: "Webhook deleted" });
}
