import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await (db as any).sSHKey.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, key } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!key || typeof key !== "string" || key.trim().length === 0) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 });
  }

  const parts = key.trim().split(/\s+/);
  if (parts.length < 2) {
    return NextResponse.json({ error: "Invalid public key format. Expected: <keyType> <keyBody> [comment]" }, { status: 400 });
  }

  const keyType = parts[0];
  const keyBody = parts[1];

  const validKeyTypes = ["ssh-rsa", "ssh-ed25519", "ssh-dss", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521", "sk-ssh-ed25519@openssh.com", "sk-ecdsa-sha2-nistp256@openssh.com"];
  if (!validKeyTypes.includes(keyType)) {
    return NextResponse.json({ error: `Unsupported key type: ${keyType}` }, { status: 400 });
  }

  let fingerprint: string;
  try {
    const keyBuf = Buffer.from(keyBody, "base64");
    const hash = crypto.createHash("sha256").update(keyBuf).digest("base64");
    fingerprint = `SHA256:${hash.replace(/=+$/, "")}`;
  } catch {
    return NextResponse.json({ error: "Invalid public key encoding" }, { status: 400 });
  }

  // Check for duplicate fingerprint for this user
  const existing = await (db as any).sSHKey.findFirst({
    where: { userId: session.userId, fingerprint },
  });
  if (existing) {
    return NextResponse.json({ error: "This SSH key has already been added" }, { status: 400 });
  }

  const record = await (db as any).sSHKey.create({
    data: {
      userId: session.userId,
      title: title.trim(),
      keyType,
      keyBody,
      fingerprint,
    },
  });

  return NextResponse.json({ key: record }, { status: 201 });
}
