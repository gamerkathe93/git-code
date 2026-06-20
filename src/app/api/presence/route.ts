import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageKey } = await req.json();
  if (!pageKey) return NextResponse.json({ error: "pageKey required" }, { status: 400 });

  // Upsert presence (update lastSeen)
  await (db as any).presence.upsert({
    where: { userId_pageKey: { userId: session.userId, pageKey } },
    create: { userId: session.userId, pageKey },
    update: { lastSeen: new Date() },
  });

  // Clean up stale presence (older than 30 seconds)
  await (db as any).presence.deleteMany({
    where: { lastSeen: { lt: new Date(Date.now() - 30_000) } },
  });

  // Fetch current viewers (last 20 seconds)
  const viewers = await (db as any).presence.findMany({
    where: {
      pageKey,
      lastSeen: { gt: new Date(Date.now() - 20_000) },
    },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { lastSeen: "desc" },
  });

  return NextResponse.json({
    viewers: viewers.map((v: any) => v.user).filter((u: any) => u.id !== session.userId),
  });
}
