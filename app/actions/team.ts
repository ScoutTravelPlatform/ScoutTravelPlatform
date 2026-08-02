"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import { sendTeamInvitationEmail } from "@/lib/email";
import { syncOrganizationAdvisorSeats } from "@/lib/billing";

const schema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(["owner", "admin", "advisor", "assistant", "finance", "read_only"]),
});

export async function updateTeamRoleAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Choose a valid team role." };
  const supabase = await createAuthorizedClient();
  const { data: targetMembership } = await supabase.from("organization_memberships")
    .select("organization_id")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  const { error } = await supabase.rpc("update_team_member_role", {
    target_membership_id: parsed.data.membershipId,
    new_role: parsed.data.role,
  });
  if (error) return { error: "Scout could not change that role. Confirm you have permission and that the organization retains an owner." };
  if (targetMembership) {
    try {
      await syncOrganizationAdvisorSeats(supabase, targetMembership.organization_id);
    } catch (syncError) {
      console.error("Stripe seat synchronization failed after role change", syncError instanceof Error ? syncError.message : "Unknown error");
    }
  }
  revalidatePath("/team");
  revalidatePath("/billing");
  return { error: null };
}

const invitationSchema = z.object({ organizationId: z.string().uuid(), email: z.string().trim().toLowerCase().pipe(z.email()), role: z.enum(["owner", "admin", "advisor", "assistant", "finance", "read_only"]) });
export async function createTeamInvitationAction(input: unknown) {
  const parsed = invitationSchema.safeParse(input); if (!parsed.success) return { error: "Enter a valid email and role.", token: null };
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.rpc("create_team_invitation", { target_organization_id: parsed.data.organizationId, invite_email: parsed.data.email, invite_role: parsed.data.role });
  if (error || !data?.[0]) return { error: "Scout could not create that invitation. The person may already be a member, or your role may not allow it.", token: null };
  const { data: organization } = await supabase.from("organizations").select("name").eq("id", parsed.data.organizationId).maybeSingle();
  const delivery = await sendTeamInvitationEmail({ to: parsed.data.email, organizationName: organization?.name ?? "your travel team", role: parsed.data.role, invitationToken: data[0].invitation_token });
  if (delivery.status !== "not_configured") {
    const { data: authData } = await supabase.auth.getUser();
    await supabase.from("email_deliveries").insert({ organization_id: parsed.data.organizationId, category: "team_invitation", recipient_email: parsed.data.email, subject: `Join ${organization?.name ?? "your travel team"} in Scout`, provider: "resend", provider_reference: delivery.providerReference, status: delivery.status, error_code: delivery.errorCode, created_by: authData.user?.id ?? null });
  }
  revalidatePath("/team"); return { error: null, token: data[0].invitation_token, emailStatus: delivery.status };
}
export async function revokeTeamInvitationAction(invitationId: string) {
  if (!z.string().uuid().safeParse(invitationId).success) return { error: "Invalid invitation." };
  const supabase = await createAuthorizedClient(); const { error } = await supabase.rpc("revoke_team_invitation", { target_invitation_id: invitationId });
  if (error) return { error: "Scout could not revoke that invitation." }; revalidatePath("/team"); return { error: null };
}
