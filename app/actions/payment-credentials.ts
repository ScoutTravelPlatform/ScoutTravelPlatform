"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient, getActiveOrganizationId } from "@/lib/auth";
import { detectCardBrand } from "@/lib/card-brand";
import { encryptCardField, getPaymentEncryptionKey } from "@/lib/payment-encryption";
import { clientPaymentCredentialSchema } from "@/lib/validation";
import type { TablesInsert } from "@/lib/supabase/database.types";

export async function addClientPaymentCredentialAction(input: unknown) {
  const parsed = clientPaymentCredentialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the card details and try again." };

  const supabase = await createAuthorizedClient();
  const organizationId = await getActiveOrganizationId(supabase);
  if (!organizationId) return { ok: false, error: "Scout could not determine your organization." };

  const { data: trip } = await supabase.from("trips").select("id,client_id").eq("id", parsed.data.tripId).maybeSingle();
  if (!trip || trip.client_id !== parsed.data.clientId) return { ok: false, error: "That trip is not valid for this client." };

  const key = getPaymentEncryptionKey();
  const encryptedPan = `\\x${encryptCardField(parsed.data.cardNumber, key).toString("hex")}`;
  const encryptedCvc = `\\x${encryptCardField(parsed.data.cvc, key).toString("hex")}`;
  const lastFour = parsed.data.cardNumber.slice(-4);

  // organization_id must be supplied explicitly here (and on the two inserts
  // below) — unlike client_travelers/client_celebrations, this table's
  // tenant trigger only validates the value against the client, it doesn't
  // populate it from scratch.
  const { data: credential, error } = await supabase.from("payment_credentials").insert({
    organization_id: organizationId,
    client_id: parsed.data.clientId,
    provider: "scout_encrypted",
    provider_reference: `scout_${randomBytes(16).toString("hex")}`,
    encrypted_pan: encryptedPan,
    encrypted_cvc: encryptedCvc,
    expiration_month: parsed.data.expirationMonth,
    expiration_year: parsed.data.expirationYear,
    cvc_expires_at: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    credential_type: "card",
    display_label: parsed.data.label,
    brand: detectCardBrand(parsed.data.cardNumber),
    last_four: lastFour,
    consent_version: "advisor-recorded-v1",
    consent_recorded_at: new Date().toISOString(),
  } as TablesInsert<"payment_credentials">).select("id").single();
  if (error || !credential) return { ok: false, error: "Scout could not save that card." };

  const { error: authorizationError } = await supabase.from("payment_credential_authorizations").insert({
    organization_id: organizationId,
    credential_id: credential.id,
    trip_id: parsed.data.tripId,
    supplier: parsed.data.supplier,
    purpose: parsed.data.purpose,
    maximum_amount: parsed.data.maximumAmount,
    authorized_at: new Date().toISOString(),
  } as TablesInsert<"payment_credential_authorizations">);
  if (authorizationError) return { ok: false, error: "Scout could not save that card." };

  const { data: authData } = await supabase.auth.getUser();
  await supabase.from("payment_credential_events").insert({
    organization_id: organizationId,
    credential_id: credential.id,
    actor_user_id: authData.user?.id ?? null,
    action: "created",
    supplier: parsed.data.supplier,
    outcome: "advisor_added",
    metadata: { workflow: "advisor_direct_entry" },
  } as TablesInsert<"payment_credential_events">);

  revalidatePath(`/clients/${parsed.data.clientId}`);
  return { ok: true, error: null };
}

export async function revokeClientPaymentCredentialAction(credentialId: string, clientId: string) {
  const parsedId = z.uuid().safeParse(credentialId);
  if (!parsedId.success) return { ok: false, error: "That card is not valid." };

  const supabase = await createAuthorizedClient();
  const { error } = await supabase.from("payment_credentials").update({ status: "revoked" }).eq("id", parsedId.data);
  if (error) return { ok: false, error: "Scout could not remove that card." };

  revalidatePath(`/clients/${clientId}`);
  return { ok: true, error: null };
}
