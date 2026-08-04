import "server-only";
import { deliverClientEmail, deliverTeamInvitationEmail } from "@/lib/email-core";

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

export async function sendClientIntakeInvitationEmail(input: { to: string; advisorOrganizationName: string; invitationToken: string }): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SCOUT_EMAIL_FROM;
  const appUrl = process.env.SCOUT_APP_URL;
  if (!apiKey || !from || !appUrl) return { status: "not_configured", providerReference: null, errorCode: "email_not_configured" };
  const intakeUrl = `${appUrl.replace(/\/$/, "")}/intake/${input.invitationToken}`;
  return deliverClientEmail({
    apiKey,
    from,
    to: input.to,
    subject: `${input.advisorOrganizationName} would like to plan your trip`,
    text: `Your travel advisor at ${input.advisorOrganizationName} has invited you to share your travel profile so they can plan your trip.\n\nFill it in here: ${intakeUrl}\n\nThis private link works only for you.`,
    category: "transactional",
    idempotencyKey: `client-intake-invite-${input.invitationToken.slice(0, 32)}`,
  });
}
