import { NextResponse } from "next/server";
import { currentSession, sessionCookieName } from "@/lib/auth/session";
import { requireSameOrigin } from "@/lib/security";
import { audit } from "@/lib/repo/fiscal";

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return NextResponse.json({ error: "Origem inválida" }, { status: 403 }); }
  const session = await currentSession();
  if (session) await audit(session.email, "auth.logout", "session", null, {});
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookieName, "", { expires: new Date(0), path: "/" });
  return response;
}
