"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient, getActiveOrganizationId } from "@/lib/auth";
import type { TablesInsert } from "@/lib/supabase/database.types";
import type { OrgInheritedInsert } from "@/lib/supabase/org-inherited-insert";
import { clientInputSchema, normalizePhoneE164, nullableDate, nullableValue, tripInputSchema } from "@/lib/validation";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const invalidInput = { ok: false, error: "Check the form and try again." } as const;
const saveFailure = { ok: false, error: "Scout could not save that change. Try again." } as const;

export async function createClientAction(input: unknown): Promise<ActionResult> {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput;

  const supabase = await createAuthorizedClient();
  const organizationId = await getActiveOrganizationId(supabase);
  if (!organizationId) return saveFailure;
  const { error } = await supabase.from("clients").insert({
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email,
    phone_e164: normalizePhoneE164(parsed.data.phone),
    sms_consent_status: parsed.data.smsConsent ? "opted_in" : "not_asked",
    sms_consent_at: parsed.data.smsConsent ? new Date().toISOString() : null,
    sms_consent_source: parsed.data.smsConsent ? "advisor_recorded" : null,
    organization_id: organizationId,
  });

  if (error) {
    console.error("createClientAction failed", { code: error.code });
    return saveFailure;
  }

  revalidatePath("/clients");
  return { ok: true, data: undefined };
}

export async function updateClientAction(
  clientId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsedId = z.uuid().safeParse(clientId);
  const parsed = clientInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return invalidInput;

  const supabase = await createAuthorizedClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("sms_consent_status")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!existing) return { ok: false, error: "That client is no longer available." };
  const nextConsentStatus = parsed.data.smsConsent
    ? "opted_in"
    : existing.sms_consent_status === "opted_in"
      ? "opted_out"
      : existing.sms_consent_status;
  const { data, error } = await supabase
    .from("clients")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      phone_e164: normalizePhoneE164(parsed.data.phone),
      sms_consent_status: nextConsentStatus,
      sms_consent_at: nextConsentStatus === existing.sms_consent_status
        ? undefined
        : new Date().toISOString(),
      sms_consent_source: nextConsentStatus === "opted_in" ? "advisor_recorded" : null,
    })
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return saveFailure;
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/communications");
  return { ok: true, data: undefined };
}

export async function updateClientNotesAction(
  clientId: string,
  notes: unknown,
): Promise<ActionResult> {
  const parsedId = z.uuid().safeParse(clientId);
  const parsedNotes = z.string().trim().max(5_000).safeParse(notes);
  if (!parsedId.success || !parsedNotes.success) return invalidInput;
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ notes: nullableValue(parsedNotes.data) })
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return saveFailure;
  revalidatePath(`/clients/${clientId}`);
  return { ok: true, data: undefined };
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  const parsedId = z.uuid().safeParse(clientId);
  if (!parsedId.success) return invalidInput;
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("deleteClientAction failed", { code: error.code });
    return saveFailure;
  }
  if (!data) return { ok: false, error: "That client is no longer available." };
  revalidatePath("/clients");
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function createTripAction(input: unknown): Promise<ActionResult> {
  const parsed = tripInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput;

  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.clientId)
    .maybeSingle();

  if (!client) return { ok: false, error: "That client is no longer available." };

  const { error } = await supabase.from("trips").insert({
    ...toTripRecord(parsed.data),
    assigned_advisor_id: authData.user?.id ?? null,
  } as TablesInsert<"trips">);
  if (error) {
    console.error("createTripAction failed", { code: error.code });
    return saveFailure;
  }

  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true, data: undefined };
}

export async function assignTripAdvisorAction(
  tripId: string,
  advisorId: string | null,
): Promise<ActionResult> {
  const idSchema = z.string().uuid();
  if (!idSchema.safeParse(tripId).success || (advisorId && !idSchema.safeParse(advisorId).success)) {
    return invalidInput;
  }

  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: trip } = await supabase.from("trips").select("organization_id").eq("id", tripId).maybeSingle();
  if (!trip || !authData.user) return { ok: false, error: "That trip is no longer available." };

  const { data: actor } = await supabase.from("organization_memberships")
    .select("role")
    .eq("organization_id", trip.organization_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
    return { ok: false, error: "Only an owner or administrator can reassign a trip." };
  }

  if (advisorId) {
    const { data: advisor } = await supabase.from("organization_memberships")
      .select("id")
      .eq("organization_id", trip.organization_id)
      .eq("user_id", advisorId)
      .maybeSingle();
    if (!advisor) return { ok: false, error: "Choose a member of this Scout team." };
  }

  const { data, error } = await supabase.from("trips")
    .update({ assigned_advisor_id: advisorId })
    .eq("id", tripId)
    .select("id")
    .maybeSingle();
  if (error || !data) return saveFailure;
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function updateTripAction(
  tripId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsedId = tripInputSchema.shape.clientId.safeParse(tripId);
  const parsed = tripInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return invalidInput;

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("trips")
    .update(toTripRecord(parsed.data))
    .eq("id", parsedId.data)
    .eq("client_id", parsed.data.clientId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("updateTripAction failed", { code: error.code });
    return saveFailure;
  }

  if (!data) return { ok: false, error: "That booking is no longer available." };

  revalidatePath(`/trips/${data.id}`);
  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true, data };
}

export async function deleteTripAction(tripId: string): Promise<ActionResult> {
  const parsedId = z.uuid().safeParse(tripId);
  if (!parsedId.success) return invalidInput;
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", parsedId.data)
    .select("id, client_id")
    .maybeSingle();
  if (error) {
    console.error("deleteTripAction failed", { code: error.code });
    return saveFailure;
  }
  if (!data) return { ok: false, error: "That trip is no longer available." };
  revalidatePath("/trips");
  revalidatePath(`/clients/${data.client_id}`);
  revalidatePath("/quotes");
  revalidatePath("/tasks");
  revalidatePath("/communications");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

function toTripRecord(input: ReturnType<typeof tripInputSchema.parse>): OrgInheritedInsert<"trips"> {
  return {
    client_id: input.clientId,
    trip_name: input.tripName,
    destination: input.destination,
    supplier: nullableValue(input.supplier),
    resort_hotel: nullableValue(input.resortHotel),
    room_option: nullableValue(input.roomOption),
    booking_number: nullableValue(input.bookingNumber),
    start_date: input.startDate,
    end_date: input.endDate,
    final_payment_date: nullableDate(input.finalPaymentDate),
    package_price: input.packagePrice,
    commission_amount: input.commissionAmount,
    adults: input.adults,
    children: input.children,
    status: input.status,
  };
}
