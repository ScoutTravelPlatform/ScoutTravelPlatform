"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import { deliverCommunication, toCommunicationChannel } from "@/lib/communications";
import type { Tables } from "@/lib/supabase/database.types";

type Result<T = undefined> =
  | { data: T; error: null }
  | { data: null; error: string };

const idSchema = z.uuid();
const messageSchema = z.object({
  tripId: z.uuid(),
  channel: z.enum(["email", "sms"]),
  messageType: z.enum([
    "general",
    "payment_reminder",
    "trip_reminder",
    "document_reminder",
    "welcome_home",
  ]),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(1).max(10_000),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export async function saveCommunicationAction(
  input: unknown,
): Promise<Result<Tables<"communication_drafts">>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: "Check the message and try again." };
  }
  if (parsed.data.channel === "email" && !parsed.data.subject?.trim()) {
    return { data: null, error: "Add a subject before saving this email." };
  }
  if (
    parsed.data.scheduledFor &&
    new Date(parsed.data.scheduledFor).getTime() <= Date.now() + 60_000
  ) {
    return { data: null, error: "Choose a delivery time at least one minute from now." };
  }

  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { data: null, error: "Sign in again to continue." };

  const { data: trip } = await supabase
    .from("trips")
    .select("id,organization_id,client_id,clients(email,phone_e164,sms_consent_status)")
    .eq("id", parsed.data.tripId)
    .maybeSingle();
  if (!trip) return { data: null, error: "That trip is no longer available." };

  const recipient =
    parsed.data.channel === "email" ? trip.clients?.email : trip.clients?.phone_e164;
  if (!recipient) {
    return {
      data: null,
      error:
        parsed.data.channel === "email"
          ? "This client does not have an email address."
          : "Add a mobile number to the client before preparing a text message.",
    };
  }
  if (parsed.data.channel === "sms" && trip.clients?.sms_consent_status !== "opted_in") {
    return {
      data: null,
      error: "Texting is blocked until the client’s explicit SMS consent is recorded.",
    };
  }

  const { data, error } = await supabase
    .from("communication_drafts")
    .insert({
      organization_id: trip.organization_id,
      trip_id: trip.id,
      client_id: trip.client_id,
      channel: parsed.data.channel,
      message_type: parsed.data.messageType,
      recipient_address: recipient,
      subject: parsed.data.channel === "email" ? parsed.data.subject?.trim() ?? null : null,
      body: parsed.data.body,
      status: parsed.data.scheduledFor ? "scheduled" : "draft",
      scheduled_for: parsed.data.scheduledFor ?? null,
      created_by: authData.user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("saveCommunicationAction failed", { code: error.code });
    return { data: null, error: "Scout could not save this message. Try again." };
  }
  revalidatePath("/communications");
  return { data, error: null };
}

export async function sendCommunicationAction(
  communicationId: string,
): Promise<Result<Tables<"communication_drafts">>> {
  if (!idSchema.safeParse(communicationId).success) {
    return { data: null, error: "That message is not valid." };
  }

  const supabase = await createAuthorizedClient();
  const { data: message } = await supabase
    .from("communication_drafts")
    .select("*")
    .eq("id", communicationId)
    .maybeSingle();
  if (!message) return { data: null, error: "That message is no longer available." };
  if (message.status === "sent" || message.status === "sending") {
    return { data: null, error: "That message has already been sent or is being delivered." };
  }

  const { data: claimed } = await supabase
    .from("communication_drafts")
    .update({ status: "sending", error_code: null })
    .eq("id", message.id)
    .in("status", ["draft", "scheduled", "failed"])
    .select("id")
    .maybeSingle();
  if (!claimed) return { data: null, error: "That message could not be prepared for delivery." };

  const delivery = await deliverCommunication({
    id: message.id,
    channel: toCommunicationChannel(message.channel),
    recipient: message.recipient_address,
    subject: message.subject,
    body: message.body,
    automated: false,
  });
  const status =
    delivery.status === "sent"
      ? "sent"
      : delivery.status === "not_configured"
        ? "draft"
        : "failed";
  const { data: updated, error } = await supabase
    .from("communication_drafts")
    .update({
      status,
      sent_at: delivery.status === "sent" ? new Date().toISOString() : null,
      provider: delivery.provider,
      provider_reference: delivery.providerReference,
      error_code: delivery.errorCode,
    })
    .eq("id", message.id)
    .select("*")
    .single();

  if (delivery.status !== "not_configured") {
    await recordDelivery(supabase, message, delivery);
  }
  revalidatePath("/communications");
  if (error) return { data: null, error: "Delivery finished, but Scout could not refresh its status." };
  if (delivery.status === "not_configured") {
    return {
      data: null,
      error:
        message.channel === "email"
          ? "Email delivery is not configured yet."
          : "SMS delivery is not configured yet.",
    };
  }
  if (delivery.status === "failed") {
    return { data: null, error: "The provider could not deliver this message. You can retry it." };
  }
  return { data: updated, error: null };
}

export async function cancelCommunicationAction(
  communicationId: string,
): Promise<Result> {
  if (!idSchema.safeParse(communicationId).success) {
    return { data: null, error: "That message is not valid." };
  }
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase
    .from("communication_drafts")
    .update({ status: "canceled", scheduled_for: null })
    .eq("id", communicationId)
    .in("status", ["draft", "scheduled", "failed"])
    .select("id")
    .maybeSingle();
  if (error || !data) return { data: null, error: "Scout could not cancel that message." };
  revalidatePath("/communications");
  return { data: undefined, error: null };
}

type AuthClient = Awaited<ReturnType<typeof createAuthorizedClient>>;
type Delivery = Awaited<ReturnType<typeof deliverCommunication>>;

async function recordDelivery(
  supabase: AuthClient,
  message: Tables<"communication_drafts">,
  delivery: Delivery,
) {
  if (delivery.status === "not_configured") return;
  if (message.channel === "email") {
    await supabase.from("email_deliveries").insert({
      organization_id: message.organization_id,
      category: message.scheduled_for ? "automation" : "transactional",
      recipient_email: message.recipient_address,
      subject: message.subject ?? "Scout travel update",
      provider: delivery.provider,
      provider_reference: delivery.providerReference,
      status: delivery.status,
      error_code: delivery.errorCode,
      created_by: message.created_by,
    });
    return;
  }
  await supabase.from("sms_deliveries").insert({
    organization_id: message.organization_id,
    communication_id: message.id,
    recipient_phone: message.recipient_address,
    provider: delivery.provider,
    provider_reference: delivery.providerReference,
    status: delivery.status,
    error_code: delivery.errorCode,
    created_by: message.created_by,
  });
}
