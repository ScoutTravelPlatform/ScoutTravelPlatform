"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPasswordResetRedirect } from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrganizationAdvisorSeats } from "@/lib/billing";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(200),
});
const organizationSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const newPasswordSchema = z
  .object({
    password: z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function signInAction(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "The email or password was not recognized." };

  return { error: null };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(input: unknown) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email address.", sent: false };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: getPasswordResetRedirect(process.env.SCOUT_APP_URL),
    });

    if (error) console.error("Password reset request failed:", error.message);
  } catch (error) {
    console.error(
      "Password reset request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Use the same response whether or not the account exists.
  return { error: null, sent: true };
}

export async function updatePasswordAction(input: unknown) {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === "confirmPassword");
    return {
      error: mismatch ? "The passwords do not match." : "Use a password of at least 8 characters.",
      updated: false,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { error: "This reset link is invalid or has expired. Request a new one.", updated: false };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Scout could not update the password. Request a new reset link and try again.", updated: false };
  }

  return { error: null, updated: true };
}

export async function createOrganizationAction(name: unknown) {
  const parsed = organizationSchema.safeParse(name);
  if (!parsed.success) return { error: "Enter an organization name." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sign in again to continue." };

  const { error } = await supabase.rpc("create_organization", {
    organization_name: parsed.data,
  });
  if (error) return { error: "Scout could not create the organization." };
  return { error: null };
}

const joinSchema = credentialsSchema.extend({ token: z.string().regex(/^[a-f0-9]{64}$/), fullName: z.string().trim().min(1).max(150) });
export async function joinTeamAction(input: unknown) {
  const parsed = joinSchema.safeParse(input); if (!parsed.success) return { error: "Enter your name, invited email, and a password of at least 8 characters.", joined: false };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.fullName } } });
  if (error) return { error: "Scout could not create this account. If you already have one, sign in instead.", joined: false };
  if (!data.session) return { error: "If this email is new, check your inbox to confirm it. If you have used Scout before, choose I have an account or reset your password.", joined: false };
  const { error: acceptError } = await supabase.rpc("accept_team_invitation", { invitation_token: parsed.data.token });
  if (acceptError) return { error: "The account was created, but the invitation could not be accepted.", joined: false };
  await syncJoinedOrganizationSeats(supabase, data.user?.id);
  return { error: null, joined: true };
}
export async function signInAndJoinTeamAction(input: unknown) {
  const parsed = credentialsSchema.extend({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(input); if (!parsed.success) return { error: "Enter the invited email and password.", joined: false };
  const supabase = await createClient(); const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: "The email or password was not recognized.", joined: false };
  const { error: acceptError } = await supabase.rpc("accept_team_invitation", { invitation_token: parsed.data.token });
  if (acceptError) return { error: "This invitation does not match the signed-in email or is no longer available.", joined: false };
  const { data: authData } = await supabase.auth.getUser();
  await syncJoinedOrganizationSeats(supabase, authData.user?.id);
  return { error: null, joined: true };
}

async function syncJoinedOrganizationSeats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | undefined) {
  if (!userId) return;
  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membership) return;
  try {
    await syncOrganizationAdvisorSeats(createAdminClient(), membership.organization_id);
  } catch (error) {
    console.error("Stripe seat synchronization failed after team join", error instanceof Error ? error.message : "Unknown error");
  }
}
