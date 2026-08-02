import { describe, expect, it } from "vitest";
import { buildCommunicationTemplate } from "./communication-templates";

const context = {
  channel: "email" as const,
  clientFirstName: "Avery",
  tripName: "Family Adventure",
  destination: "Walt Disney World",
  startDate: "2026-10-12",
  endDate: "2026-10-18",
  finalPaymentDate: "2026-09-01",
  nextPayment: { name: "Final package payment", amount: 2500, dueDate: "2026-09-01" },
};

describe("communication templates", () => {
  it("uses trusted trip context in payment reminders", () => {
    const result = buildCommunicationTemplate({
      ...context,
      messageType: "payment_reminder",
    });
    expect(result.subject).toContain("Family Adventure");
    expect(result.body).toContain("$2,500.00");
    expect(result.body).toContain("September 1, 2026");
  });

  it("produces a concise SMS without an email subject", () => {
    const result = buildCommunicationTemplate({
      ...context,
      channel: "sms",
      messageType: "trip_reminder",
    });
    expect(result.subject).toBe("");
    expect(result.body).not.toContain("\n\n");
    expect(result.body).toContain("Walt Disney World");
  });
});
