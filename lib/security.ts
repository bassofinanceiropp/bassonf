import crypto from "crypto";
import { env } from "@/lib/env";
import { adminSupabase } from "@/lib/repo/supabase";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const target = new URL(request.url).origin;
  if (origin !== target) throw new Error("INVALID_ORIGIN");
}

export function clientFingerprint(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(`${forwarded}|${agent}|${email}|${env.sessionSecret || "basso"}`).digest("hex");
}

const fallback = new Map<string, { attempts: number; windowStarted: number; blockedUntil: number }>();
const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

async function dbRateLimit(key: string) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  try {
    const db = adminSupabase();
    const { data, error } = await db.from("auth_rate_limits").select("*").eq("key_hash", key).maybeSingle();
    if (error) return null;
    return data;
  } catch { return null; }
}

export async function isLoginBlocked(key: string) {
  const now = Date.now();
  const row = await dbRateLimit(key);
  if (row?.blocked_until && new Date(row.blocked_until).getTime() > now) {
    return { blocked: true, retryAfterSeconds: Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000) };
  }
  const local = fallback.get(key);
  if (local?.blockedUntil && local.blockedUntil > now) return { blocked: true, retryAfterSeconds: Math.ceil((local.blockedUntil - now) / 1000) };
  return { blocked: false, retryAfterSeconds: 0 };
}

export async function recordLoginFailure(key: string) {
  const now = Date.now();
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try {
      const db = adminSupabase();
      const current = await dbRateLimit(key);
      const windowStarted = current?.window_started ? new Date(current.window_started).getTime() : now;
      const reset = now - windowStarted > WINDOW_MS;
      const attempts = reset ? 1 : Number(current?.attempts || 0) + 1;
      const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now + BLOCK_MS).toISOString() : null;
      await db.from("auth_rate_limits").upsert({
        key_hash: key,
        attempts,
        window_started: new Date(reset ? now : windowStarted).toISOString(),
        blocked_until: blockedUntil,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key_hash" });
      return;
    } catch {}
  }
  const current = fallback.get(key);
  const reset = !current || now - current.windowStarted > WINDOW_MS;
  const attempts = reset ? 1 : current.attempts + 1;
  fallback.set(key, { attempts, windowStarted: reset ? now : current.windowStarted, blockedUntil: attempts >= MAX_ATTEMPTS ? now + BLOCK_MS : 0 });
}

export async function clearLoginFailures(key: string) {
  fallback.delete(key);
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try { await adminSupabase().from("auth_rate_limits").delete().eq("key_hash", key); } catch {}
  }
}
