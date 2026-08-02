import { describe, expect, it } from "vitest";
import { getDashboardMetrics, getHottestLeads } from "./dashboard";

describe("getDashboardMetrics", () => {
  it("separates overdue and upcoming operational work", () => {
    const metrics = getDashboardMetrics({
      today: "2026-07-23",
      trips: [
        {
          id: "trip-1",
          trip_name: "Disney",
          destination: "Orlando",
          start_date: "2026-08-01",
          end_date: "2026-08-07",
          final_payment_date: null,
          supplier: "Disney",
          booking_number: null,
          status: "Planning",
        },
      ],
      tasks: [
        { due_date: "2026-07-22", completed: false },
        { due_date: "2026-07-22", completed: true },
      ],
      payments: [
        { due_date: "2026-07-20", paid: false },
        { due_date: "2026-07-28", paid: false },
        { due_date: "2026-07-28", paid: true },
      ],
      commissions: [
        {
          expected_pay_date: "2026-07-01",
          expected_commission: 500,
          commission_received: 100,
        },
      ],
    });

    expect(metrics).toEqual({
      overdueActions: 2,
      overdueTasks: 1,
      overduePayments: 1,
      paymentsDueSoon: 1,
      incompleteBookings: 1,
      overdueCommissions: 1,
      upcomingTrips: 1,
    });
  });
});

describe("getHottestLeads", () => {
  it("ranks quotes by engagement and favorited options", () => {
    const leads = getHottestLeads({
      quotes: [
        { id: "quote-1", tripId: "trip-1", title: "Family suite", clientName: "Mina", tripName: "Disney" },
        { id: "quote-2", tripId: "trip-2", title: "Beach villa", clientName: "Noah", tripName: "Sandals" },
      ],
      views: [
        { quoteId: "quote-1", count: 3, totalTimeOnPage: 480 },
        { quoteId: "quote-2", count: 2, totalTimeOnPage: 240 },
      ],
      interactions: [
        { quoteId: "quote-1", optionTitle: "Grand villa", interactionType: "favorite", count: 2 },
        { quoteId: "quote-2", optionTitle: "Ocean suite", interactionType: "favorite", count: 1 },
      ],
    });

    expect(leads).toEqual([
      {
        quoteId: "quote-1",
        tripId: "trip-1",
        title: "Family suite",
        clientName: "Mina",
        tripName: "Disney",
        totalViews: 3,
        totalTimeOnPage: 480,
        mostFavoritedOption: "Grand villa",
        engagementScore: 5,
      },
      {
        quoteId: "quote-2",
        tripId: "trip-2",
        title: "Beach villa",
        clientName: "Noah",
        tripName: "Sandals",
        totalViews: 2,
        totalTimeOnPage: 240,
        mostFavoritedOption: "Ocean suite",
        engagementScore: 3,
      },
    ]);
  });
});
