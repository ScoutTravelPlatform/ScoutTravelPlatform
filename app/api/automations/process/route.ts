import { timingSafeEqual } from "node:crypto";
import { deliverCommunication, toCommunicationChannel } from "@/lib/communications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron sends GET, not POST — this was never actually reachable by the
// scheduler (see vercel.json), only callable by hand. Exporting GET as an
// alias, rather than renaming POST, keeps this callable either way without
// disturbing anything that already POSTs to it directly.
export const GET = POST;

export async function POST(request: Request) {
  if (!hasValidCronSecret(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: dueMessages, error } = await supabase
    .from("communication_drafts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(25);
  if (error) return Response.json({ error: "Could not load scheduled messages." }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const message of dueMessages ?? []) {
    const { data: claimed } = await supabase
      .from("communication_drafts")
      .update({ status: "sending", error_code: null })
      .eq("id", message.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const delivery = await deliverCommunication({
      id: message.id,
      channel: toCommunicationChannel(message.channel),
      recipient: message.recipient_address,
      subject: message.subject,
      body: message.body,
      automated: true,
    });
    const succeeded = delivery.status === "sent";
    await supabase
      .from("communication_drafts")
      .update({
        status: succeeded ? "sent" : "failed",
        sent_at: succeeded ? new Date().toISOString() : null,
        provider: delivery.provider,
        provider_reference: delivery.providerReference,
        error_code: delivery.errorCode,
      })
      .eq("id", message.id);
    if (delivery.status !== "not_configured") {
      await recordDelivery(supabase, message, delivery);
    }
    if (succeeded) sent += 1;
    else failed += 1;
  }

  return Response.json({ processed: sent + failed, sent, failed });
}

function hasValidCronSecret(authorization: string | null) {
  const secret = process.env.CRON_SECRET;
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

type AdminClient = ReturnType<typeof createAdminClient>;
type Delivery = Awaited<ReturnType<typeof deliverCommunication>>;

async function recordDelivery(
  supabase: AdminClient,
  message: Tables<"communication_drafts">,
  delivery: Delivery,
) {
  if (delivery.status === "not_configured") return;
  if (message.channel === "email") {
    await supabase.from("email_deliveries").insert({
      organization_id: message.organization_id,
      category: "automation",
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
