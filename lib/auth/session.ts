import crypto from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE = "basso_fiscal_session";

function sign(value: string) {
  return crypto.createHmac("sha256", env.sessionSecret).update(value).digest("hex");
}

export function makeSession(email: string) {
  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token?: string | null) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.email || !parsed.expires || parsed.expires < Date.now()) return null;
    return parsed as { email: string; expires: number };
  } catch {
    return null;
  }
}

export async function currentSession() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value);
}

export async function requireSession() {
  const session = await currentSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export const sessionCookieName = COOKIE;
