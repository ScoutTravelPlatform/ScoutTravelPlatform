// Promotion Opportunities v1 — mirrors lib/disney-timeline.ts exactly: a
// plain, hand-maintained rules array, not a live data feed. There is no
// public API for current Disney promotions, so this only ever reflects what
// gets added here manually. The two seeded rules below are clearly-labeled
// EXAMPLES to prove the mechanism, not asserted as real current live offers.

export type DisneyPromotionRule = {
  key: string;
  title: string;
  description: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
  sourceUrl: string | null;
};

export type PromotionTripDates = { start_date: string | null; end_date: string | null };

export const DISNEY_PROMOTION_RULES: readonly DisneyPromotionRule[] = [
  {
    key: "example.room-discount",
    title: "EXAMPLE — Seasonal room discount",
    description: "Placeholder rule to demonstrate the matching mechanism. Replace arrivalWindowStart/arrivalWindowEnd with a real current Disney room-discount window when one is announced, and update this description with the actual offer terms.",
    arrivalWindowStart: "2026-08-01",
    arrivalWindowEnd: "2026-10-05",
    sourceUrl: "https://disneyworld.disney.go.com/special-offers/",
  },
  {
    key: "example.free-dining",
    title: "EXAMPLE — Free dining plan",
    description: "Placeholder rule to demonstrate the matching mechanism. Replace arrivalWindowStart/arrivalWindowEnd with a real current free-dining window when one is announced, and update this description with the actual offer terms.",
    arrivalWindowStart: "2026-09-01",
    arrivalWindowEnd: "2026-11-20",
    sourceUrl: "https://disneyworld.disney.go.com/special-offers/",
  },
] as const;

export function matchDisneyPromotions(trip: PromotionTripDates): DisneyPromotionRule[] {
  if (!trip.start_date) return [];
  return DISNEY_PROMOTION_RULES.filter(
    (rule) => trip.start_date! >= rule.arrivalWindowStart && trip.start_date! <= rule.arrivalWindowEnd,
  );
}
