import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: session.userId, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, readAll } = await req.json();

  if (readAll) {
    await db.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (id) {
    // Ownership check — only mark your own notifications
    await db.notification.updateMany({
      where: { id, userId: session.userId },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide id or readAll" }, { status: 400 });
}
