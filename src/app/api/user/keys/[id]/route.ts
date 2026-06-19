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

  const key = await (db as any).sSHKey.findUnique({ where: { id } });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  if (key.userId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await (db as any).sSHKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
