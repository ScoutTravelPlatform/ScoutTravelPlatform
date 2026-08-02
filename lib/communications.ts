import "server-only";

import { deliverClientEmail } from "@/lib/email-core";
import { deliverTwilioSms } from "@/lib/sms-core";

export type CommunicationDeliveryResult = {
  status: "sent" | "failed" | "not_configured";
  provider: "resend" | "twilio";
  providerReference: string | null;
  errorCode: string | null;
};

export type CommunicationChannel = "email" | "sms";

// communication_drafts.channel is a plain text column constrained to these
// values by application writes, not a database enum, so gen-types reports it
// as `string`. Rows are only ever written by the app, so this narrowing is safe.
export function toCommunicationChannel(value: string): CommunicationChannel {
  if (value !== "email" && value !== "sms") {
    throw new Error(`Unexpected communication channel: ${value}`);
  }
  return value;
}

export function communicationProviderStatus() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.SCOUT_EMAIL_FROM),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    ),
  };
}

export async function deliverCommunication(input: {
  id: string;
  channel: "email" | "sms";
  recipient: string;
  subject: string | null;
  body: string;
  automated: boolean;
}): Promise<CommunicationDeliveryResult> {
  if (input.channel === "email") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.SCOUT_EMAIL_FROM;
    if (!apiKey || !from || !input.subject) {
      return {
        status: "not_configured",
        provider: "resend",
        providerReference: null,
        errorCode: "email_not_configured",
      };
    }
    const result = await deliverClientEmail({
      apiKey,
      from,
      to: input.recipient,
      subject: input.subject,
      text: input.body,
      category: input.automated ? "automation" : "transactional",
      idempotencyKey: `communication-${input.id}`,
    });
    return { ...result, provider: "resend" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    return {
      status: "not_configured",
      provider: "twilio",
      providerReference: null,
      errorCode: "sms_not_configured",
    };
  }
  const result = await deliverTwilioSms({
    accountSid,
    authToken,
    from,
    to: input.recipient,
    body: input.body,
  });
  return { ...result, provider: "twilio" };
}
