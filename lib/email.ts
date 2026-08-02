import "server-only";
import { deliverTeamInvitationEmail } from "@/lib/email-core";

type DeliveryResult = { status: "sent" | "failed" | "not_configured"; providerReference: string | null; errorCode: string | null };

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.SCOUT_EMAIL_FROM && process.env.SCOUT_APP_URL);
}

export async function sendTeamInvitationEmail(input: { to: string; organizationName: string; role: string; invitationToken: string }): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SCOUT_EMAIL_FROM;
  const appUrl = process.env.SCOUT_APP_URL;
  if (!apiKey || !from || !appUrl) return { status: "not_configured", providerReference: null, errorCode: "email_not_configured" };
  return deliverTeamInvitationEmail({apiKey,from,appUrl,...input});
}
