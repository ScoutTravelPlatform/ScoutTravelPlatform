import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentAuthorizationNotificationEmail } from "@/lib/email";

type NotifyInput = {
  tripId: string;
  organizationId: string;
  supplier: string;
  purpose: string;
  maximumAmount: number | null;
  authorizationId: string;
};

// Runs after a client-portal payment authorization (new card or existing
// card) is saved. The portal routes calling this have no Supabase session —
// createAdminClient() (service role) is required both to resolve the
// advisor's email via the Auth admin API and to insert email_deliveries,
// since its RLS insert policy requires an authenticated owner/admin actor
// that doesn't exist in this anonymous flow. Never throws: a client's card
// save must succeed even if no one can be notified.
export async function notifyAdvisorOfPaymentAuthorization(input: NotifyInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: trip } = await admin.from("trips")
      .select("assigned_advisor_id, trip_name, client_id, clients(first_name, last_name)")
      .eq("id", input.tripId)
      .maybeSingle();
    if (!trip) return;

    let recipientUserId = trip.assigned_advisor_id;
    if (!recipientUserId) {
      const { data: owner } = await admin.from("organization_memberships")
        .select("user_id")
        .eq("organization_id", input.organizationId)
        .eq("role", "owner")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      recipientUserId = owner?.user_id ?? null;
    }
    if (!recipientUserId) return;

    const { data: userData } = await admin.auth.admin.getUserById(recipientUserId);
    const recipientEmail = userData.user?.email;
    if (!recipientEmail) return;

    const clientName = `${trip.clients?.first_name ?? ""} ${trip.clients?.last_name ?? ""}`.trim() || "Your client";
    const delivery = await sendPaymentAuthorizationNotificationEmail({
      to: recipientEmail,
      clientName,
      tripName: trip.trip_name ?? "their trip",
      clientId: trip.client_id,
      supplier: input.supplier,
      purpose: input.purpose,
      maximumAmount: input.maximumAmount,
      authorizationId: input.authorizationId,
    });
    if (delivery.status === "not_configured") return;

    await admin.from("email_deliveries").insert({
      organization_id: input.organizationId,
      category: "transactional",
      recipient_email: recipientEmail.toLowerCase(),
      subject: `${clientName} authorized a payment for ${trip.trip_name ?? "their trip"}`,
      provider: "resend",
      provider_reference: delivery.providerReference,
      status: delivery.status,
      error_code: delivery.errorCode,
      created_by: null,
    });
  } catch (error) {
    console.error("Payment authorization notification failed", error instanceof Error ? error.message : "Unknown error");
  }
}
