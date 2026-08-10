import { createAuthorizedClient } from "@/lib/auth";
import { createStripeClient, getBillingReturnOrigin, getStripeBillingConfig, isStripeBillingConfigured } from "@/lib/billing";

export async function POST(request: Request) {
  if (!isStripeBillingConfigured()) return Response.redirect(new URL("/billing?setup=required", request.url), 303);

  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return Response.json({ error: "Only an owner or administrator can start billing." }, { status: 403 });
  }

  const [{ data: organization }, { data: billing }, { count: advisorSeats }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).maybeSingle(),
    supabase.from("organization_billing").select("provider_customer_id, provider_subscription_id, status").eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("role", "advisor"),
  ]);
  const stripe = createStripeClient();
  const config = getStripeBillingConfig();
  const origin = getBillingReturnOrigin(request);

  if (billing?.provider_subscription_id && billing.status !== "canceled" && billing.status !== "incomplete_expired") {
    if (!billing.provider_customer_id) return Response.redirect(new URL("/billing?error=customer", origin), 303);
    const portal = await stripe.billingPortal.sessions.create({ customer: billing.provider_customer_id, return_url: `${origin}/billing` });
    return Response.redirect(portal.url, 303);
  }

  let customerId = billing?.provider_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: authData.user.email,
      name: organization?.name ?? undefined,
      metadata: { scout_organization_id: membership.organization_id },
    });
    customerId = customer.id;
    const { error } = await supabase.from("organization_billing").upsert({
      organization_id: membership.organization_id,
      provider_customer_id: customerId,
      advisor_seat_quantity: advisorSeats ?? 0,
    });
    if (error) return Response.redirect(new URL("/billing?error=save", origin), 303);
  }

  if ((advisorSeats ?? 0) === 0) {
    return Response.redirect(new URL("/billing?error=seats", origin), 303);
  }
  const lineItems = [{ price: config.advisorPriceId, quantity: advisorSeats ?? 0 }];
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: membership.organization_id,
    line_items: lineItems,
    allow_promotion_codes: true,
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    subscription_data: { trial_period_days: 14, metadata: { scout_organization_id: membership.organization_id } },
    metadata: { scout_organization_id: membership.organization_id, advisor_seats: String(advisorSeats ?? 0) },
  });
  if (!checkout.url) return Response.redirect(new URL("/billing?error=checkout", origin), 303);
  return Response.redirect(checkout.url, 303);
}
