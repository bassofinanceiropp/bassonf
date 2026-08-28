import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { makeSession, sessionCookieName } from "@/lib/auth/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const base = new URL(request.url).origin;
  if (email !== env.adminEmail.toLowerCase() || password !== env.adminPassword) {
    return NextResponse.redirect(`${base}/login?error=1`, 303);
  }
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
