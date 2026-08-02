import { createAuthorizedClient } from "@/lib/auth";
import { getBillingReturnOrigin, syncOrganizationAdvisorSeats } from "@/lib/billing";

export async function POST(request: Request) {
  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return Response.json({ error: "Only an owner or administrator can update billed seats." }, { status: 403 });
  }
  const origin = getBillingReturnOrigin(request);
  try {
    await syncOrganizationAdvisorSeats(supabase, membership.organization_id);
    return Response.redirect(new URL("/billing?seats=synced", origin), 303);
  } catch (error) {
    console.error("Stripe seat synchronization failed", error instanceof Error ? error.message : "Unknown error");
    return Response.redirect(new URL("/billing?error=seats", origin), 303);
  }
}
