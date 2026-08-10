"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import { generateDisneyTimeline, isDisneyTrip } from "@/lib/disney-timeline";
import {
  commissionInputSchema,
  itineraryItemInputSchema,
  nullableDate,
  nullableValue,
  paymentInputSchema,
  quoteInputSchema,
  taskInputSchema,
  timelineEventInputSchema,
} from "@/lib/validation";

type Result<T = undefined> = { data: T; error: null } | { data: null; error: string };
const idSchema = z.uuid();
const failed = <T>(): Result<T> => ({ data: null, error: "Scout could not save that change. Try again." });
const invalid = <T>(): Result<T> => ({ data: null, error: "Check the information and try again." });

function refreshTrip(tripId: string) {
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/dashboard");
}

export async function addTaskAction(input: unknown): Promise<Result<Tables<"booking_tasks">>> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_tasks").insert({
    trip_id: parsed.data.tripId,
    title: parsed.data.title,
    due_date: nullableDate(parsed.data.dueDate),
    assignee_id: parsed.data.assigneeId || null,
    completed: false,
  } as TablesInsert<"booking_tasks">).select("*").single();
  if (error) return failed();
  refreshTrip(parsed.data.tripId);
  revalidatePath("/tasks");
  return { data, error: null };
}

export async function setTaskAssigneeAction(
  tripId: string,
  taskId: string,
  assigneeId: string | null
): Promise<Result> {
  if (
    !idSchema.safeParse(tripId).success ||
    !idSchema.safeParse(taskId).success ||
    (assigneeId !== null && !idSchema.safeParse(assigneeId).success)
  ) return invalid();

  const supabase = await createAuthorizedClient();
  const { data: task, error: taskError } = await supabase.from("booking_tasks")
    .select("organization_id")
    .eq("id", taskId)
    .eq("trip_id", tripId)
    .maybeSingle();
  if (taskError) return failed();
  if (!task) return { data: null, error: "That task is no longer available." };

  if (assigneeId) {
    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", task.organization_id)
      .eq("user_id", assigneeId)
      .maybeSingle();
    if (membershipError) return failed();
    if (!membership) return { data: null, error: "Choose a member of this Scout team." };
  }

  const { data, error } = await supabase.from("booking_tasks")
    .update({ assignee_id: assigneeId })
    .eq("id", taskId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That task is no longer available." };
  refreshTrip(tripId);
  revalidatePath("/tasks");
  return { data: undefined, error: null };
}

export async function setTaskCompletedAction(tripId: string, taskId: string, completed: boolean): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(taskId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_tasks").update({ completed })
    .eq("id", taskId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That task is no longer available." };
  refreshTrip(tripId);
  revalidatePath("/tasks");
  return { data: undefined, error: null };
}

export async function deleteTaskAction(tripId: string, taskId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(taskId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_tasks").delete()
    .eq("id", taskId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That task is no longer available." };
  refreshTrip(tripId);
  revalidatePath("/tasks");
  return { data: undefined, error: null };
}

type QuoteStatus = Tables<"trip_quotes">["status"];
const quoteStatusSchema = z.enum(["Draft", "Sent", "Accepted", "Declined", "Expired"]);

type QuoteOptionRecord = Tables<"trip_quote_options">;

const quoteOptionInputSchema = z.object({
  quoteId: z.uuid(),
  tripId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  supplier: z.string().trim().min(1).max(200),
  resortName: z.string().trim().max(200).nullable().optional(),
  roomOption: z.string().trim().max(200).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  totalAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative().nullable(),
  notes: z.string().trim().max(2_000).nullable().optional(),
  isRecommended: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().optional(),
});

export async function addQuoteAction(input: unknown): Promise<Result<Tables<"trip_quotes">>> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return invalid();

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quotes").insert({
    trip_id: parsed.data.tripId,
    title: parsed.data.title,
    supplier: parsed.data.supplier,
    total_amount: parsed.data.totalAmount,
    deposit_amount: parsed.data.depositAmount,
    expires_on: nullableDate(parsed.data.expiresOn),
    notes: nullableValue(parsed.data.notes),
    status: "Draft",
  } as TablesInsert<"trip_quotes">).select("*").single();

  if (error) return failed();
  revalidatePath("/quotes");
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function setQuoteStatusAction(
  tripId: string,
  quoteId: string,
  status: QuoteStatus
): Promise<Result<Tables<"trip_quotes">>> {
  if (
    !idSchema.safeParse(tripId).success ||
    !idSchema.safeParse(quoteId).success ||
    !quoteStatusSchema.safeParse(status).success
  ) return invalid();

  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quotes")
    .update({ status })
    .eq("id", quoteId)
    .eq("trip_id", tripId)
    .select("*")
    .maybeSingle();

  if (error) return failed();
  if (!data) return { data: null, error: "That quote is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(tripId);
  return { data, error: null };
}

export async function setQuoteVisibilityAction(
  tripId: string,
  quoteId: string,
  clientVisible: boolean
): Promise<Result<Tables<"trip_quotes">>> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(quoteId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data: existing, error: existingError } = await supabase.from("trip_quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("trip_id", tripId)
    .maybeSingle();
  if (existingError) return failed();
  if (!existing) return { data: null, error: "That quote is no longer available." };

  const status = clientVisible && existing.status === "Draft" ? "Sent" : existing.status;
  const { data, error } = await supabase.from("trip_quotes")
    .update({ client_visible: clientVisible, status })
    .eq("id", quoteId)
    .eq("trip_id", tripId)
    .select("*")
    .maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That quote is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(tripId);
  return { data, error: null };
}

export async function deleteQuoteAction(tripId: string, quoteId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(quoteId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quotes").delete()
    .eq("id", quoteId)
    .eq("trip_id", tripId)
    .select("id")
    .maybeSingle();

  if (error) return failed();
  if (!data) return { data: null, error: "That quote is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(tripId);
  return { data: undefined, error: null };
}

export async function addQuoteOptionAction(input: unknown): Promise<Result<QuoteOptionRecord>> {
  const parsed = quoteOptionInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quote_options").insert({
    quote_id: parsed.data.quoteId,
    title: parsed.data.title,
    supplier: parsed.data.supplier,
    resort_name: parsed.data.resortName ?? null,
    room_option: parsed.data.roomOption ?? null,
    image_url: parsed.data.imageUrl ?? null,
    total_amount: parsed.data.totalAmount,
    deposit_amount: parsed.data.depositAmount,
    is_recommended: parsed.data.isRecommended,
    notes: parsed.data.notes ?? null,
    sort_order: parsed.data.sortOrder ?? 0,
  } as TablesInsert<"trip_quote_options">).select("*").single();
  if (error) return failed();
  revalidatePath("/quotes");
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

const quoteOptionUpdateSchema = quoteOptionInputSchema.extend({ optionId: z.uuid() });

export async function updateQuoteOptionAction(input: unknown): Promise<Result<QuoteOptionRecord>> {
  const parsed = quoteOptionUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quote_options")
    .update({
      title: parsed.data.title,
      supplier: parsed.data.supplier,
      resort_name: parsed.data.resortName ?? null,
      room_option: parsed.data.roomOption ?? null,
      image_url: parsed.data.imageUrl ?? null,
      total_amount: parsed.data.totalAmount,
      deposit_amount: parsed.data.depositAmount,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.optionId)
    .eq("quote_id", parsed.data.quoteId)
    .select("*")
    .maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That option is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function setQuoteOptionRecommendationAction(
  tripId: string,
  quoteId: string,
  optionId: string,
  recommended: boolean,
): Promise<Result<QuoteOptionRecord>> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(quoteId).success || !idSchema.safeParse(optionId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quote_options")
    .update({ is_recommended: recommended })
    .eq("id", optionId)
    .eq("quote_id", quoteId)
    .select("*")
    .maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That quote option is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(tripId);
  return { data, error: null };
}

export async function deleteQuoteOptionAction(tripId: string, quoteId: string, optionId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(quoteId).success || !idSchema.safeParse(optionId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trip_quote_options").delete()
    .eq("id", optionId)
    .eq("quote_id", quoteId)
    .select("id")
    .maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That option is no longer available." };
  revalidatePath("/quotes");
  refreshTrip(tripId);
  return { data: undefined, error: null };
}

export async function addPaymentAction(input: unknown): Promise<Result<Tables<"booking_payments">>> {
  const parsed = paymentInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_payments").insert({
    trip_id: parsed.data.tripId,
    payment_name: parsed.data.paymentName,
    amount: parsed.data.amount,
    due_date: nullableDate(parsed.data.dueDate),
    paid: false,
    paid_date: null,
  } as TablesInsert<"booking_payments">).select("*").single();
  if (error) return failed();
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function setPaymentPaidAction(tripId: string, paymentId: string, paid: boolean, paidDate: string | null): Promise<Result<Tables<"booking_payments">>> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(paymentId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_payments").update({ paid, paid_date: paid ? paidDate : null })
    .eq("id", paymentId).eq("trip_id", tripId).select("*").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That payment is no longer available." };
  refreshTrip(tripId);
  return { data, error: null };
}

export async function updatePaymentAction(paymentId: string, input: unknown): Promise<Result<Tables<"booking_payments">>> {
  const parsed = paymentInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(paymentId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_payments").update({
    payment_name: parsed.data.paymentName,
    amount: parsed.data.amount,
    due_date: nullableDate(parsed.data.dueDate),
  }).eq("id", paymentId).eq("trip_id", parsed.data.tripId).select("*").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That payment is no longer available." };
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function deletePaymentAction(tripId: string, paymentId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(paymentId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_payments").delete()
    .eq("id", paymentId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That payment is no longer available." };
  refreshTrip(tripId);
  return { data: undefined, error: null };
}

export async function addCommissionAction(input: unknown): Promise<Result<Tables<"booking_commissions">>> {
  const parsed = commissionInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_commissions").insert({
    trip_id: parsed.data.tripId,
    supplier: parsed.data.supplier,
    commission_percent: parsed.data.commissionPercent,
    expected_commission: parsed.data.expectedCommission,
    commission_received: 0,
    expected_pay_date: nullableDate(parsed.data.expectedPayDate),
    received_date: null,
    status: "Waiting",
    notes: nullableValue(parsed.data.notes),
  } as TablesInsert<"booking_commissions">).select("*").single();
  if (error) return failed();
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function setCommissionReceiptAction(tripId: string, commissionId: string, received: boolean, amount: number, receivedDate: string | null): Promise<Result<Tables<"booking_commissions">>> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(commissionId).success || !z.number().nonnegative().safeParse(amount).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_commissions").update({
    commission_received: received ? amount : 0,
    received_date: received ? receivedDate : null,
    status: received ? "Received" : "Waiting",
  }).eq("id", commissionId).eq("trip_id", tripId).select("*").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That commission is no longer available." };
  refreshTrip(tripId);
  return { data, error: null };
}

export async function updateCommissionAction(commissionId: string, input: unknown, receivedAmount: number): Promise<Result<Tables<"booking_commissions">>> {
  const parsed = commissionInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(commissionId).success || receivedAmount < 0) return invalid();
  const status = receivedAmount >= parsed.data.expectedCommission && parsed.data.expectedCommission > 0
    ? "Received" : receivedAmount > 0 ? "Partially Received" : "Waiting";
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_commissions").update({
    supplier: parsed.data.supplier,
    commission_percent: parsed.data.commissionPercent,
    expected_commission: parsed.data.expectedCommission,
    expected_pay_date: nullableDate(parsed.data.expectedPayDate),
    notes: nullableValue(parsed.data.notes),
    status,
  }).eq("id", commissionId).eq("trip_id", parsed.data.tripId).select("*").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That commission is no longer available." };
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function deleteCommissionAction(tripId: string, commissionId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(commissionId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_commissions").delete()
    .eq("id", commissionId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That commission is no longer available." };
  refreshTrip(tripId);
  return { data: undefined, error: null };
}

export async function addTimelineEventAction(input: unknown): Promise<Result<Tables<"booking_timeline_events">>> {
  const parsed = timelineEventInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_timeline_events").insert({
    trip_id: parsed.data.tripId,
    event_type: parsed.data.eventType,
    title: parsed.data.title,
    description: nullableValue(parsed.data.description),
    event_date: nullableDate(parsed.data.eventDate),
    status: parsed.data.status,
  } as TablesInsert<"booking_timeline_events">).select("*").single();
  if (error) return failed();
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function updateTimelineEventAction(eventId: string, input: unknown): Promise<Result<Tables<"booking_timeline_events">>> {
  const parsed = timelineEventInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(eventId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_timeline_events").update({
    event_type: parsed.data.eventType,
    title: parsed.data.title,
    description: nullableValue(parsed.data.description),
    event_date: nullableDate(parsed.data.eventDate),
    status: parsed.data.status,
    is_advisor_override: true,
  }).eq("id", eventId).eq("trip_id", parsed.data.tripId).select("*").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That timeline event is no longer available." };
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function generateDisneyTimelineAction(tripId: string): Promise<Result<Tables<"booking_timeline_events">[]>> {
  if (!idSchema.safeParse(tripId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id,trip_name,destination,supplier,resort_hotel,start_date,end_date,final_payment_date")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) return failed();
  if (!trip) return { data: null, error: "That trip is no longer available." };
  if (!isDisneyTrip([trip.trip_name, trip.destination, trip.supplier, trip.resort_hotel])) {
    return { data: null, error: "Disney Smart Timeline is available for Disney trips." };
  }

  const generated = generateDisneyTimeline(trip);
  const { data: existing, error: existingError } = await supabase
    .from("booking_timeline_events")
    .select("rule_key,is_advisor_override")
    .eq("trip_id", tripId)
    .not("rule_key", "is", null);

  if (existingError) return failed();
  const overriddenKeys = new Set(
    (existing ?? [])
      .filter((event) => event.is_advisor_override && event.rule_key)
      .map((event) => event.rule_key as string)
  );
  const rows = generated
    .filter((event) => !overriddenKeys.has(event.rule_key))
    .map((event) => ({
      ...event,
      trip_id: tripId,
      generated_at: new Date().toISOString(),
      is_advisor_override: false,
    }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("booking_timeline_events")
      .upsert(rows as TablesInsert<"booking_timeline_events">[], { onConflict: "trip_id,rule_key" });
    if (upsertError) return failed();
  }

  const { data, error } = await supabase
    .from("booking_timeline_events")
    .select("*")
    .eq("trip_id", tripId)
    .order("event_date", { ascending: true });
  if (error) return failed();

  refreshTrip(tripId);
  return { data: data ?? [], error: null };
}

export async function deleteTimelineEventAction(tripId: string, eventId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(eventId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("booking_timeline_events").delete()
    .eq("id", eventId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That timeline event is no longer available." };
  refreshTrip(tripId);
  return { data: undefined, error: null };
}

export async function addItineraryItemAction(input: unknown): Promise<Result<Tables<"itinerary_items">>> {
  const parsed = itineraryItemInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("itinerary_items").insert({
    trip_id: parsed.data.tripId,
    item_date: parsed.data.itemDate,
    start_time: parsed.data.startTime || null,
    category: parsed.data.category,
    title: parsed.data.title,
    location: nullableValue(parsed.data.location),
    confirmation_number: nullableValue(parsed.data.confirmationNumber),
    notes: nullableValue(parsed.data.notes),
    client_visible: parsed.data.clientVisible,
  } as TablesInsert<"itinerary_items">).select("*").single();
  if (error) return failed();
  refreshTrip(parsed.data.tripId);
  return { data, error: null };
}

export async function deleteItineraryItemAction(tripId: string, itemId: string): Promise<Result> {
  if (!idSchema.safeParse(tripId).success || !idSchema.safeParse(itemId).success) return invalid();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("itinerary_items").delete()
    .eq("id", itemId).eq("trip_id", tripId).select("id").maybeSingle();
  if (error) return failed();
  if (!data) return { data: null, error: "That itinerary item is no longer available." };
  refreshTrip(tripId);
  return { data: undefined, error: null };
}
