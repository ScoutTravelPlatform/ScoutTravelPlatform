import { describe, expect, it } from "vitest";
import { generateDisneyTimeline, isDisneyTrip } from "./disney-timeline";

describe("generateDisneyTimeline", () => {
  it("calculates dates deterministically across month and year boundaries", () => {
    const events = generateDisneyTimeline({
      start_date: "2027-01-10",
      end_date: "2027-01-17",
      final_payment_date: "2026-12-11",
    });

    expect(events.find((event) => event.rule_key === "wdw.dining-window")?.event_date).toBe("2026-11-11");
    expect(events.find((event) => event.rule_key === "trip.final-payment")?.event_date).toBe("2026-12-11");
    expect(events.find((event) => event.rule_key === "trip.welcome-home")?.event_date).toBe("2027-01-18");
    expect(events.find((event) => event.rule_key === "wdw.memory-maker")?.event_date).toBe("2027-01-06");
    expect(events.find((event) => event.rule_key === "wdw.photopass-download")?.event_date).toBe("2027-02-21");
  });

  it("skips a rule when its anchor date is unavailable", () => {
    const events = generateDisneyTimeline({
      start_date: "2027-06-01",
      end_date: "2027-06-08",
      final_payment_date: null,
    });

    expect(events.some((event) => event.rule_key === "trip.final-payment")).toBe(false);
    expect(events).toHaveLength(14);
  });

  it("keeps eligibility-dependent Lightning Lane timing as an advisor review", () => {
    const event = generateDisneyTimeline({
      start_date: "2027-06-01",
      end_date: "2027-06-08",
      final_payment_date: "2027-05-01",
    }).find((item) => item.rule_key === "wdw.lightning-lane-planning");

    expect(event).toMatchObject({
      event_date: "2027-05-22",
      client_visible: false,
      event_type: "Booking",
    });
  });
});

describe("isDisneyTrip", () => {
  it("recognizes common Disney World booking labels", () => {
    expect(isDisneyTrip(["Walt Disney World Resort"])).toBe(true);
    expect(isDisneyTrip([null, "WDW", undefined])).toBe(true);
  });

  it("does not classify unrelated Orlando trips as Disney", () => {
    expect(isDisneyTrip(["Orlando", "SeaWorld", "Under the Sea"])).toBe(false);
  });
});
