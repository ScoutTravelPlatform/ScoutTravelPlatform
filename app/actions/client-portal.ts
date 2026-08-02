"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

const idSchema = z.uuid();

export async function createClientPortalLinkAction(tripId: string) {
  const parsed = idSchema.safeParse(tripId);
  if (!parsed.success) return { path: null, expiresAt: null, error: "That trip is not valid." };
  const supabase = await createAuthorizedClient();
  const { data: trip } = await supabase.from("trips").select("id").eq("id", parsed.data).maybeSingle();
  if (!trip) return { path: null, expiresAt: null, error: "That trip is no longer available." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("client_portal_links").upsert({
    trip_id: parsed.data, token_hash: tokenHash, expires_at: expiresAt, revoked_at: null,
  } as TablesInsert<"client_portal_links">, { onConflict: "trip_id" });
  if (error) return { path: null, expiresAt: null, error: "Scout could not create the portal link." };
  revalidatePath(`/trips/${parsed.data}`);
  return { path: `/portal/${token}`, expiresAt, error: null };
}

export async function revokeClientPortalLinkAction(tripId: string) {
  const parsed = idSchema.safeParse(tripId);
  if (!parsed.success) return { error: "That trip is not valid." };
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("client_portal_links").update({ revoked_at: new Date().toISOString() })
    .eq("trip_id", parsed.data).select("id").maybeSingle();
  if (error) return { error: "Scout could not revoke the portal link." };
  if (!data) return { error: "No active portal link was found." };
  revalidatePath(`/trips/${parsed.data}`);
  return { error: null };
}

const quoteResponseSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  quoteId: z.uuid(),
  response: z.enum(["Accepted", "Declined"]),
});

export async function respondToQuoteAction(input: unknown) {
  const parsed = quoteResponseSchema.safeParse(input);
  if (!parsed.success) return { status: null, error: "That response is not valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_to_trip_quote", {
    portal_token: parsed.data.token,
    target_quote_id: parsed.data.quoteId,
    client_response: parsed.data.response,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return { status: null, error: "Scout could not record your response. Please ask your advisor for help." };
  }
  const status = "status" in data ? data.status : null;
  if (status !== "Accepted" && status !== "Declined") {
    return { status: null, error: "Scout could not confirm your response." };
  }
  return { status, error: null };
}

const quoteOptionInteractionSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  quoteId: z.uuid(),
  optionId: z.uuid(),
  interactionType: z.enum(["favorite", "details", "compare"]),
});

export async function recordQuoteOptionInteractionAction(input: unknown) {
  const parsed = quoteOptionInteractionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That interaction is not valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_trip_quote_option_interaction", {
    portal_token: parsed.data.token,
    target_quote_id: parsed.data.quoteId,
    target_option_id: parsed.data.optionId,
    interaction_type: parsed.data.interactionType,
  });
  if (error) return { ok: false, error: "Scout could not record that interaction." };
  return { ok: true, error: null };
}
