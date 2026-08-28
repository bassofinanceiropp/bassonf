import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function adminSupabase() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase fiscal não configurado");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
