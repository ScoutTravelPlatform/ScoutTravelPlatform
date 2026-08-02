import "server-only";

import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const requiredBillingEnvironment = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_ADVISOR_PRICE_ID",
] as const;

export function isStripeBillingConfigured() {
  return requiredBillingEnvironment.every((name) => Boolean(process.env[name]?.trim()));
}

export function getStripeBillingConfig() {
  const values = Object.fromEntries(requiredBillingEnvironment.map((name) => [name, process.env[name]?.trim()]));
  for (const name of requiredBillingEnvironment) {
    if (!values[name]) throw new Error(`Missing required billing environment variable: ${name}`);
  }
  return {
    secretKey: values.STRIPE_SECRET_KEY!,
    webhookSecret: values.STRIPE_WEBHOOK_SECRET!,
    advisorPriceId: values.STRIPE_ADVISOR_PRICE_ID!,
  };
}

export function createStripeClient() {
  return new Stripe(getStripeBillingConfig().secretKey);
}

export function getBillingReturnOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS");
    return url.origin;
  }
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname !== "localhost" && requestUrl.hostname !== "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_APP_URL is required outside local development");
  }
  return requestUrl.origin;
}

export function stripeStatusToLocal(status: Stripe.Subscription.Status):
  "trialing" | "active" | "past_due" | "unpaid" | "paused" | "incomplete" | "incomplete_expired" | "canceled" {
  switch (status) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "paused": return "paused";
    case "incomplete": return "incomplete";
    case "incomplete_expired": return "incomplete_expired";
    case "canceled": return "canceled";
    default:
      return "incomplete";
  }
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const timestamps = subscription.items.data.map((item) => item.current_period_end);
  return timestamps.length ? new Date(Math.max(...timestamps) * 1000).toISOString() : null;
}

export async function syncOrganizationAdvisorSeats(
  supabase: SupabaseClient<Database>,
  organizationId: string,
) {
  if (!isStripeBillingConfigured()) return null;
  const [{ data: billing }, { count }] = await Promise.all([
    supabase.from("organization_billing")
      .select("provider_subscription_id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase.from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "advisor"),
  ]);
  const advisorSeats = count ?? 0;
  if (!billing?.provider_subscription_id) return advisorSeats;

  const stripe = createStripeClient();
  const config = getStripeBillingConfig();
  const subscription = await stripe.subscriptions.retrieve(billing.provider_subscription_id);
  const seatItem = subscription.items.data.find((item) => item.price.id === config.advisorPriceId);
  if (seatItem && advisorSeats === 0) {
    await stripe.subscriptionItems.del(seatItem.id, { proration_behavior: "create_prorations" });
  } else if (seatItem) {
    await stripe.subscriptionItems.update(seatItem.id, { quantity: advisorSeats, proration_behavior: "create_prorations" });
  } else if (advisorSeats > 0) {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: config.advisorPriceId,
      quantity: advisorSeats,
      proration_behavior: "create_prorations",
    });
  }
  await supabase.from("organization_billing").update({ advisor_seat_quantity: advisorSeats }).eq("organization_id", organizationId);
  return advisorSeats;
}
