import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  response.headers.append(
    "Set-Cookie",
    "gitcode_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );
  return response;
}
