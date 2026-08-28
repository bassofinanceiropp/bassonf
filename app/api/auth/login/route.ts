import crypto from "crypto";
import { NextResponse } from "next/server";
import { authConfigurationIssues, env } from "@/lib/env";
import { makeSession, sessionCookieName } from "@/lib/auth/session";
import { clearLoginFailures, clientFingerprint, isLoginBlocked, recordLoginFailure, requireSameOrigin } from "@/lib/security";
import { audit } from "@/lib/repo/fiscal";

export async function POST(request: Request) {
  const base = new URL(request.url).origin;
  try { requireSameOrigin(request); } catch { return NextResponse.redirect(`${base}/login?error=origin`, 303); }
  const issues = authConfigurationIssues();
  if (issues.length) return NextResponse.redirect(`${base}/login?error=config`, 303);
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const fingerprint = clientFingerprint(request, email);
  const limit = await isLoginBlocked(fingerprint);
  if (limit.blocked) return NextResponse.redirect(`${base}/login?error=blocked&retry=${limit.retryAfterSeconds}`, 303);

  const safeEqual = (left: string, right: string) => {
    const a = Buffer.from(left); const b = Buffer.from(right);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  if (!safeEqual(email, env.adminEmail.toLowerCase()) || !safeEqual(password, env.adminPassword)) {
    await recordLoginFailure(fingerprint);
    await audit(email || null, "auth.login_failed", "session", null, {});
    return NextResponse.redirect(`${base}/login?error=1`, 303);
  }

  await clearLoginFailures(fingerprint);
  await audit(email, "auth.login", "session", null, {});
  const response = NextResponse.redirect(`${base}/dashboard`, 303);
  response.cookies.set(sessionCookieName, makeSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return response;
}
