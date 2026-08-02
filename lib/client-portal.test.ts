import { describe, expect, it } from "vitest";
import { clientPortalSchema, groupPortalItinerary } from "./client-portal";

describe("client portal data", () => {
  it("validates and groups client-visible itinerary data by day", () => {
    const portal = clientPortalSchema.parse({
      trip: { id: "452f6fc9-298c-48c6-afb1-fcf363091caf", trip_name: "Family Vacation", destination: "Orlando", start_date: "2026-11-20", end_date: "2026-11-22", supplier: null, resort_hotel: null, booking_number: null, client_name: "Jim Brown", organization_name: "Scout Travel" },
      itinerary_items: [
        { item_date: "2026-11-21", start_time: null, category: "Dining", title: "Dinner", location: null, confirmation_number: null, notes: null },
        { item_date: "2026-11-20", start_time: "09:00:00", category: "Park", title: "Park day", location: null, confirmation_number: null, notes: null },
      ],
      important_dates: [],
      quotes: [],
    });
    const days = groupPortalItinerary(portal.itinerary_items);
    expect(days.map(([date]) => date)).toEqual(["2026-11-20", "2026-11-21"]);
  });

  it("validates client-visible quote choices", () => {
    const portal = clientPortalSchema.parse({
      trip: { id: "452f6fc9-298c-48c6-afb1-fcf363091caf", trip_name: "Family Vacation", destination: "Orlando", start_date: "2026-11-20", end_date: "2026-11-22", supplier: null, resort_hotel: null, booking_number: null, client_name: "Jim Brown", organization_name: "Scout Travel" },
      itinerary_items: [],
      important_dates: [],
      quotes: [{ id: "6bfec439-2f5e-47b8-9c62-d40acdb450d9", title: "Package option", supplier: "Disney", total_amount: "2500.00", deposit_amount: null, expires_on: null, status: "Sent", notes: null }],
    });
    expect(portal.quotes[0].total_amount).toBe(2500);
  });
});
