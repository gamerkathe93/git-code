import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-please-change-in-production"
);

const COOKIE_NAME = "gitcode_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setSessionCookie(response: Response, token: string): void {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

export async function getSessionFromToken(tokenString: string): Promise<SessionPayload | null> {
  try {
    const tokenHash = crypto.createHash("sha256").update(tokenString).digest("hex");

    const pat = await (db as any).personalAccessToken.findUnique({ where: { tokenHash } });
    if (!pat) return null;

    if (pat.expiresAt && pat.expiresAt < new Date()) return null;

    // Update lastUsedAt without awaiting to avoid blocking the response
    (db as any).personalAccessToken.update({
      where: { id: pat.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    const user = await db.user.findUnique({ where: { id: pat.userId } });
    if (!user) return null;

    return { userId: user.id, username: user.username, email: user.email };
  } catch {
    return null;
  }
}
