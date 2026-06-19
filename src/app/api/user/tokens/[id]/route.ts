import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const token = await (db as any).personalAccessToken.findUnique({ where: { id } });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  if (token.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await (db as any).personalAccessToken.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
