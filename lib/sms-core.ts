export type SmsDeliveryResult = {
  status: "sent" | "failed";
  providerReference: string | null;
  errorCode: string | null;
};

export async function deliverTwilioSms(input: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  request?: typeof fetch;
}): Promise<SmsDeliveryResult> {
  const response = await (input.request ?? fetch)(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(input.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: input.from, To: input.to, Body: input.body }),
    },
  );
  const result = await response.json().catch(() => null) as {
    sid?: string;
    code?: number;
  } | null;
  if (!response.ok || !result?.sid) {
    return {
      status: "failed",
      providerReference: null,
      errorCode: result?.code ? `twilio_${result.code}` : `http_${response.status}`,
    };
  }
  return { status: "sent", providerReference: result.sid, errorCode: null };
}
