import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function isAuthEnabled() {
  return process.env.SCOUT_AUTH_ENABLED === "true";
}

export async function createAuthorizedClient(): Promise<SupabaseClient<Database>> {
  const supabase = await createClient();

  if (!isAuthEnabled()) return supabase;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");

  return supabase;
}

export async function getActiveOrganizationId(supabase: SupabaseClient<Database>) {
  if (!isAuthEnabled()) return null;

  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .limit(2);

  if (error || data.length !== 1) {
    throw new Error("An active organization is required");
  }

  return data[0].organization_id;
}
