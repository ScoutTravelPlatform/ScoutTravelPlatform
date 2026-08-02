import OpenAI from "openai";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import {
  containsProhibitedPaymentData,
  generateAiDraft,
} from "@/lib/ai-draft-core";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  tripId: z.uuid(),
  channel: z.enum(["email", "sms"]),
  messageType: z.enum(["general", "payment_reminder", "trip_reminder", "document_reminder", "welcome_home"]),
  advisorNotes: z.string().trim().max(1_500).default(""),
});

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
const limitPerTenMinutes = 15;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "The AI draft assistant is not configured." }, { status: 503 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the draft request and try again." }, { status: 400 });
  if (containsProhibitedPaymentData(parsed.data.advisorNotes)) {
    return Response.json({ error: "Remove payment-card or security-code information before creating a draft." }, { status: 400 });
  }

  try {
    const supabase = await createAuthorizedClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return Response.json({ error: "Sign in again to continue." }, { status: 401 });

    const { data: trip } = await supabase
      .from("trips")
      .select("id,organization_id,trip_name,destination,start_date,end_date,supplier,resort_hotel,final_payment_date,clients(first_name,sms_consent_status)")
      .eq("id", parsed.data.tripId)
      .maybeSingle();
    if (!trip?.clients) return Response.json({ error: "That trip is no longer available." }, { status: 404 });
    if (parsed.data.channel === "sms" && trip.clients.sms_consent_status !== "opted_in") {
      return Response.json({ error: "Text drafting is blocked until client SMS consent is recorded." }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await supabase
      .from("ai_generation_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authData.user.id)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= limitPerTenMinutes) {
      return Response.json({ error: "The AI assistant has reached its short-term limit. Try again in a few minutes." }, { status: 429 });
    }

    const [paymentsResult, itineraryResult] = await Promise.all([
      supabase.from("booking_payments")
        .select("payment_name,amount,due_date,paid")
        .eq("trip_id", trip.id)
        .eq("paid", false)
        .order("due_date", { ascending: true })
        .limit(1),
      supabase.from("itinerary_items")
        .select("item_date,category,title,location")
        .eq("trip_id", trip.id)
        .eq("client_visible", true)
        .order("item_date", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(8),
    ]);
    const nextPayment = paymentsResult.data?.[0];
    const { error: auditError } = await supabase.from("ai_generation_events").insert({
      organization_id: trip.organization_id,
      user_id: authData.user.id,
      trip_id: trip.id,
      model,
    });
    if (auditError) return Response.json({ error: "Scout could not start the AI draft. Try again." }, { status: 500 });

    const draft = await generateAiDraft(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model, {
      channel: parsed.data.channel,
      messageType: parsed.data.messageType,
      advisorNotes: parsed.data.advisorNotes,
      clientFirstName: trip.clients.first_name,
      tripName: trip.trip_name ?? "this trip",
      destination: trip.destination ?? "the destination",
      startDate: trip.start_date ?? "",
      endDate: trip.end_date ?? "",
      supplier: trip.supplier,
      resortHotel: trip.resort_hotel,
      finalPaymentDate: trip.final_payment_date,
      nextPayment: nextPayment ? {
        name: nextPayment.payment_name ?? "Upcoming payment",
        amount: Number(nextPayment.amount),
        dueDate: nextPayment.due_date,
      } : null,
      itineraryHighlights: (itineraryResult.data ?? []).map((item) => ({
        date: item.item_date,
        category: item.category,
        title: item.title,
        location: item.location,
      })),
    });
    return Response.json({ draft });
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.code === "insufficient_quota") {
      return Response.json({
        error: "OpenAI API billing or credits are not active yet. Ask the Scout owner to finish OpenAI billing setup.",
      }, { status: 503 });
    }
    console.error("AI draft generation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Scout could not create an AI draft right now. Try again." }, { status: 502 });
  }
}
