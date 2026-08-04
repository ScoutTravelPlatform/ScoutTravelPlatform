import { describe, expect, it, vi } from "vitest";
import { deliverClientEmail, deliverTeamInvitationEmail } from "./email-core";
describe("team invitation email", () => {
  it("sends through Resend without exposing the API key in content", async () => {
    const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"email-1"}),{status:200}));
    const result=await deliverTeamInvitationEmail({apiKey:"secret-key",from:"Scout <team@updates.example.com>",appUrl:"https://scout.example.com",to:"advisor@example.com",organizationName:"A & B Travel",role:"read_only",invitationToken:"b".repeat(64),request});
    expect(result).toMatchObject({status:"sent",providerReference:"email-1"});
    const options=request.mock.calls[0][1]; expect(options.headers.authorization).toBe("Bearer secret-key"); expect(options.body).not.toContain("secret-key"); expect(options.body).toContain("A &amp; B Travel");
  });
});

describe("client email", () => {
  it("escapes message content before rendering HTML", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-2" }), { status: 200 }),
    );
    await deliverClientEmail({
      apiKey: "secret-key",
      from: "Scout <hello@example.com>",
      to: "client@example.com",
      subject: "Trip update",
      text: "Hello <script>alert('no')</script>\nYour trip is ready.",
      category: "transactional",
      idempotencyKey: "communication-1",
      request,
    });
    const options = request.mock.calls[0][1];
    const payload = JSON.parse(options.body);
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("<script>");
    expect(payload.text).toContain("<script>");
  });

  it("renders any URL in the message as a real clickable link, not just visible text", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-3" }), { status: 200 }),
    );
    await deliverClientEmail({
      apiKey: "secret-key",
      from: "Scout <hello@example.com>",
      to: "client@example.com",
      subject: "Your travel profile",
      text: "Fill it in here: https://scout.example.com/intake/abc123",
      category: "transactional",
      idempotencyKey: "intake-invite-1",
      request,
    });
    const options = request.mock.calls[0][1];
    const payload = JSON.parse(options.body);
    expect(payload.html).toContain('<a href="https://scout.example.com/intake/abc123"');
  });
});
