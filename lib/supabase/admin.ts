import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("Missing required server environment variable: SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(getSupabaseEnv().url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
