import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId, emoji } = await req.json();
  if (!commentId || !emoji) return NextResponse.json({ error: "commentId and emoji required" }, { status: 400 });

  // Check comment exists
  const comment = await db.comment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  // Toggle: check if reaction exists
  const existing = await (db as any).reaction.findUnique({
    where: { userId_commentId_emoji: { userId: session.userId, commentId, emoji } }
  });

  if (existing) {
    await (db as any).reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", emoji });
  } else {
    await (db as any).reaction.create({
      data: { userId: session.userId, commentId, emoji }
    });
    return NextResponse.json({ action: "added", emoji });
  }
}
