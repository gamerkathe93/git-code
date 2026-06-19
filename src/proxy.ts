import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-please-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/health"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths, static files, and git HTTP backend
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/git/") ||   // git push/clone — auth handled in route
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|css|js|woff2?|ttf|map)$/)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("gitcode_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const response = NextResponse.next();
    // Forward user info as headers for API routes
    response.headers.set("x-user-id", payload.userId as string);
    response.headers.set("x-username", payload.username as string);
    return response;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.headers.append("Set-Cookie", "gitcode_session=; Max-Age=0; Path=/");
    return response;
  }
}

export const config = {
  // Exclude /git/ from matching — body is buffered before the function runs,
  // which hits the 10MB cap on large git pushes. The git route handles its own auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|git/).*)"],
};
