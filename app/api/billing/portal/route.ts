import { createAuthorizedClient } from "@/lib/auth";
import { createStripeClient, getBillingReturnOrigin, isStripeBillingConfigured } from "@/lib/billing";

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
    return Response.json({ error: "Only an owner or administrator can manage billing." }, { status: 403 });
  }
  const { data: billing } = await supabase.from("organization_billing")
    .select("provider_customer_id")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  const origin = getBillingReturnOrigin(request);
  if (!billing?.provider_customer_id) return Response.redirect(new URL("/billing?error=customer", origin), 303);
  const portal = await createStripeClient().billingPortal.sessions.create({ customer: billing.provider_customer_id, return_url: `${origin}/billing` });
  return Response.redirect(portal.url, 303);
}
