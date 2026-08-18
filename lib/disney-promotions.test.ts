import { describe, expect, it } from "vitest";
import { matchDisneyPromotions } from "./disney-promotions";

describe("matchDisneyPromotions", () => {
  it("matches a trip whose start date falls inside a rule's arrival window", () => {
    const matches = matchDisneyPromotions({ start_date: "2026-08-15", end_date: "2026-08-22" });
    expect(matches.some((rule) => rule.key === "example.room-discount")).toBe(true);
  });

  it("matches on the exact boundary dates, inclusive", () => {
    const startBoundary = matchDisneyPromotions({ start_date: "2026-08-01", end_date: "2026-08-08" });
    expect(startBoundary.some((rule) => rule.key === "example.room-discount")).toBe(true);
    const endBoundary = matchDisneyPromotions({ start_date: "2026-10-05", end_date: "2026-10-12" });
    expect(endBoundary.some((rule) => rule.key === "example.room-discount")).toBe(true);
  });

  it("does not match a trip whose start date falls outside every rule's window", () => {
    const matches = matchDisneyPromotions({ start_date: "2026-01-01", end_date: "2026-01-08" });
    expect(matches).toHaveLength(0);
  });

  it("can match more than one rule when windows overlap", () => {
    const matches = matchDisneyPromotions({ start_date: "2026-09-15", end_date: "2026-09-22" });
    expect(matches.map((rule) => rule.key).sort()).toEqual(["example.free-dining", "example.room-discount"]);
  });

  it("returns no matches when the trip has no start date yet", () => {
    expect(matchDisneyPromotions({ start_date: null, end_date: null })).toHaveLength(0);
  });
});
