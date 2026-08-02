import { describe, expect, it } from "vitest";
import { clientInputSchema, normalizePhoneE164, paymentInputSchema, tripInputSchema } from "./validation";

describe("clientInputSchema", () => {
  it("normalizes email and names", () => {
    const result = clientInputSchema.parse({
      firstName: "  Alex ",
      lastName: " Advisor  ",
      email: " ALEX@EXAMPLE.COM ",
    });

    expect(result).toEqual({
      firstName: "Alex",
      lastName: "Advisor",
      email: "alex@example.com",
    });
  });

  it("normalizes common US mobile numbers", () => {
    expect(normalizePhoneE164("(407) 555-1234")).toBe("+14075551234");
    expect(normalizePhoneE164("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhoneE164("123")).toBeNull();
  });
});

describe("tripInputSchema", () => {
  const validTrip = {
    clientId: "1c5bb658-24b3-4a3b-b46d-981fcccbbded",
    tripName: "Disney vacation",
    destination: "Walt Disney World",
    startDate: "2026-08-12",
    endDate: "2026-08-18",
    packagePrice: 5_000,
    commissionAmount: 500,
    adults: 2,
    children: 1,
    status: "Planning",
  };

  it("accepts a valid date range", () => {
    expect(tripInputSchema.safeParse(validTrip).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(
      tripInputSchema.safeParse({ ...validTrip, endDate: "2026-08-01" }).success
    ).toBe(false);
  });
});

describe("paymentInputSchema", () => {
  it("rejects zero and negative payments", () => {
    const base = {
      tripId: "1c5bb658-24b3-4a3b-b46d-981fcccbbded",
      paymentName: "Deposit",
      dueDate: null,
    };

    expect(paymentInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(paymentInputSchema.safeParse({ ...base, amount: -1 }).success).toBe(false);
  });
});
