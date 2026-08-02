import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import {
  buildDraftInput,
  containsProhibitedPaymentData,
  generateAiDraft,
  type AiDraftContext,
} from "./ai-draft-core";

const context: AiDraftContext = {
  channel: "email",
  messageType: "trip_reminder",
  advisorNotes: "Mention that the family is excited about the resort.",
  clientFirstName: "Avery",
  tripName: "Family Adventure",
  destination: "Walt Disney World",
  startDate: "2026-10-12",
  endDate: "2026-10-18",
  supplier: "Disney Destinations",
  resortHotel: "Example Resort",
  finalPaymentDate: "2026-09-01",
  nextPayment: null,
  itineraryHighlights: [],
};

describe("AI draft generation", () => {
  it("requests a structured draft without API-side storage", async () => {
    const parse = vi.fn().mockResolvedValue({
      output_parsed: { subject: "Your trip is getting closer", body: "Hi Avery, your trip is almost here." },
    });
    const client = { responses: { parse } } as unknown as OpenAI;
    const result = await generateAiDraft(client, "gpt-5.6-sol", context);
    expect(result.subject).toContain("trip");
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5.6-sol",
      store: false,
      text: expect.any(Object),
    }));
  });

  it("labels context as untrusted and never includes payment credentials", () => {
    const input = buildDraftInput(context);
    expect(input).toContain("untrusted trip data");
    expect(input).toContain("Walt Disney World");
    expect(input).not.toMatch(/card_number|cvc_reference|pan_reference/);
  });

  it("blocks payment-card language and Luhn-valid card numbers", () => {
    expect(containsProhibitedPaymentData("Include the credit card number")).toBe(true);
    expect(containsProhibitedPaymentData("Use 4111 1111 1111 1111")).toBe(true);
    expect(containsProhibitedPaymentData("Mention the final payment date")).toBe(false);
  });
});
