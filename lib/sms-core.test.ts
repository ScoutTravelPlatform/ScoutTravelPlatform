import { describe, expect, it, vi } from "vitest";
import { deliverTwilioSms } from "./sms-core";

describe("Twilio SMS delivery", () => {
  it("sends credentials only in authorization and returns the provider reference", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sid: "SM123" }), { status: 201 }),
    );
    const result = await deliverTwilioSms({
      accountSid: "AC123",
      authToken: "private-token",
      from: "+15551230000",
      to: "+15551230001",
      body: "Your trip reminder",
      request,
    });

    expect(result).toEqual({
      status: "sent",
      providerReference: "SM123",
      errorCode: null,
    });
    const options = request.mock.calls[0][1];
    expect(options.headers.authorization).toContain("Basic ");
    expect(String(options.body)).not.toContain("private-token");
  });
});
