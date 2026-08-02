"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/lib/supabase/database.types";

// gen-types doesn't mark RPC args as nullable even when the SQL parameter
// genuinely accepts null (Postgres function params have no NOT NULL concept),
// so these casts document that mismatch rather than papering over a real bug.
type RpcArgs<Name extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][Name]["Args"];
import {
  clientIntakeCelebrationSchema,
  clientIntakeContactSchema,
  clientIntakeLoyaltyProgramSchema,
  clientIntakePreferencesSchema,
  clientIntakeTravelerSchema,
  nullableDate,
  nullableValue,
  normalizePhoneE164,
} from "@/lib/validation";

const idSchema = z.uuid();
const intakeTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export async function createClientIntakeLinkAction(clientId: string) {
  const parsed = idSchema.safeParse(clientId);
  if (!parsed.success) return { path: null, expiresAt: null, error: "That client is not valid." };
  const supabase = await createAuthorizedClient();
  const { data: client } = await supabase.from("clients").select("id").eq("id", parsed.data).maybeSingle();
  if (!client) return { path: null, expiresAt: null, error: "That client is no longer available." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("client_intake_links").upsert({
    client_id: parsed.data, token_hash: tokenHash, expires_at: expiresAt, revoked_at: null,
  } as TablesInsert<"client_intake_links">, { onConflict: "client_id" });
  if (error) return { path: null, expiresAt: null, error: "Scout could not create the intake link." };
  revalidatePath(`/clients/${parsed.data}`);
  return { path: `/intake/${token}`, expiresAt, error: null };
}

export async function revokeClientIntakeLinkAction(clientId: string) {
  const parsed = idSchema.safeParse(clientId);
  if (!parsed.success) return { error: "That client is not valid." };
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("client_intake_links").update({ revoked_at: new Date().toISOString() })
    .eq("client_id", parsed.data).select("id").maybeSingle();
  if (error) return { error: "Scout could not revoke the intake link." };
  if (!data) return { error: "No active intake link was found." };
  revalidatePath(`/clients/${parsed.data}`);
  return { error: null };
}

export async function submitClientIntakeContactAction(token: string, input: unknown) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsed = clientIntakeContactSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success) return { ok: false, error: "Check the information and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_client_intake_contact", {
    intake_token: parsedToken.data,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone ? normalizePhoneE164(parsed.data.phone) : null,
    address_line1: nullableValue(parsed.data.addressLine1),
    address_line2: nullableValue(parsed.data.addressLine2),
    city: nullableValue(parsed.data.city),
    state_province: nullableValue(parsed.data.stateProvince),
    postal_code: nullableValue(parsed.data.postalCode),
    country: nullableValue(parsed.data.country),
  } as RpcArgs<"submit_client_intake_contact">);
  if (error) return { ok: false, error: "Scout could not save your information." };
  return { ok: true, error: null };
}

export async function submitClientIntakePreferencesAction(token: string, input: unknown) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsed = clientIntakePreferencesSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success) return { ok: false, error: "Check the information and try again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_client_intake_preferences", {
    intake_token: parsedToken.data,
    travel_style: nullableValue(parsed.data.travelStyle),
    room_preferences: nullableValue(parsed.data.roomPreferences),
    favorite_resorts: parsed.data.favoriteResorts,
    favorite_cruise_lines: parsed.data.favoriteCruiseLines,
    favorite_airlines: parsed.data.favoriteAirlines,
  } as RpcArgs<"submit_client_intake_preferences">);
  if (error) return { ok: false, error: "Scout could not save your preferences." };
  return { ok: true, error: null };
}

export async function upsertClientIntakeTravelerAction(token: string, input: unknown) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsed = clientIntakeTravelerSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success) return { data: null, error: "Check the traveler details and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_client_intake_traveler", {
    intake_token: parsedToken.data,
    traveler_id: parsed.data.travelerId ?? null,
    full_name: parsed.data.fullName,
    date_of_birth: nullableDate(parsed.data.dateOfBirth),
    relationship: parsed.data.relationship || null,
    passport_number: nullableValue(parsed.data.passportNumber),
    passport_country: nullableValue(parsed.data.passportCountry),
    passport_expiration: nullableDate(parsed.data.passportExpiration),
    tsa_precheck_number: nullableValue(parsed.data.tsaPrecheckNumber),
    global_entry_number: nullableValue(parsed.data.globalEntryNumber),
    dietary_restrictions: nullableValue(parsed.data.dietaryRestrictions),
    accessibility_needs: nullableValue(parsed.data.accessibilityNeeds),
    needs_stroller: parsed.data.needsStroller ?? false,
  } as RpcArgs<"upsert_client_intake_traveler">);
  if (error || !data || typeof data !== "object" || Array.isArray(data) || !("id" in data) || typeof data.id !== "string") {
    return { data: null, error: "Scout could not save that traveler." };
  }
  return { data: { id: data.id }, error: null };
}

export async function deleteClientIntakeTravelerAction(token: string, travelerId: string) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsedId = idSchema.safeParse(travelerId);
  if (!parsedToken.success || !parsedId.success) return { ok: false, error: "That traveler is not valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_client_intake_traveler", {
    intake_token: parsedToken.data,
    traveler_id: parsedId.data,
  });
  if (error) return { ok: false, error: "Scout could not remove that traveler." };
  return { ok: true, error: null };
}

export async function upsertClientIntakeCelebrationAction(token: string, input: unknown) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsed = clientIntakeCelebrationSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success) return { data: null, error: "Check the celebration details and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_client_intake_celebration", {
    intake_token: parsedToken.data,
    celebration_id: parsed.data.celebrationId ?? null,
    occasion: parsed.data.occasion,
    occasion_date: nullableDate(parsed.data.occasionDate),
    recurring_annually: parsed.data.recurringAnnually ?? true,
    notes: nullableValue(parsed.data.notes),
  } as RpcArgs<"upsert_client_intake_celebration">);
  if (error || !data || typeof data !== "object" || Array.isArray(data) || !("id" in data) || typeof data.id !== "string") {
    return { data: null, error: "Scout could not save that celebration." };
  }
  return { data: { id: data.id }, error: null };
}

export async function deleteClientIntakeCelebrationAction(token: string, celebrationId: string) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsedId = idSchema.safeParse(celebrationId);
  if (!parsedToken.success || !parsedId.success) return { ok: false, error: "That celebration is not valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_client_intake_celebration", {
    intake_token: parsedToken.data,
    celebration_id: parsedId.data,
  });
  if (error) return { ok: false, error: "Scout could not remove that celebration." };
  return { ok: true, error: null };
}

export async function upsertClientIntakeLoyaltyProgramAction(token: string, input: unknown) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsed = clientIntakeLoyaltyProgramSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success) return { data: null, error: "Check the loyalty program details and try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_client_intake_loyalty_program", {
    intake_token: parsedToken.data,
    program_id: parsed.data.programId ?? null,
    traveler_id: parsed.data.travelerId,
    program_type: parsed.data.programType,
    program_name: parsed.data.programName,
    member_number: parsed.data.memberNumber,
  } as RpcArgs<"upsert_client_intake_loyalty_program">);
  if (error || !data || typeof data !== "object" || Array.isArray(data) || !("id" in data) || typeof data.id !== "string") {
    return { data: null, error: "Scout could not save that loyalty program." };
  }
  return { data: { id: data.id }, error: null };
}

export async function deleteClientIntakeLoyaltyProgramAction(token: string, programId: string) {
  const parsedToken = intakeTokenSchema.safeParse(token);
  const parsedId = idSchema.safeParse(programId);
  if (!parsedToken.success || !parsedId.success) return { ok: false, error: "That loyalty program is not valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_client_intake_loyalty_program", {
    intake_token: parsedToken.data,
    program_id: parsedId.data,
  });
  if (error) return { ok: false, error: "Scout could not remove that loyalty program." };
  return { ok: true, error: null };
}
