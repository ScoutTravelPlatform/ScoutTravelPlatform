import { describe, expect, it } from "vitest";
import { buildAgencyYearReport, normalizeReportYear } from "./agency-report";

describe("agency annual reporting", () => {
  it("groups trips and money by assigned advisor without counting cancelled trips", () => {
    const report = buildAgencyYearReport({
      year: 2026,
      advisors: [{ userId: "advisor-1", name: "Avery Advisor", role: "advisor" }],
      trips: [
        { id: "trip-1", assigned_advisor_id: "advisor-1", start_date: "2026-06-01", status: "Booked", package_price: 5000 },
        { id: "trip-2", assigned_advisor_id: null, start_date: "2026-08-01", status: "Planning", package_price: 2000 },
        { id: "trip-3", assigned_advisor_id: "advisor-1", start_date: "2026-09-01", status: "Cancelled", package_price: 9000 },
        { id: "trip-4", assigned_advisor_id: "advisor-1", start_date: "2025-09-01", status: "Completed", package_price: 3000 },
      ],
      payments: [
        { trip_id: "trip-1", amount: 1000, paid: true },
        { trip_id: "trip-1", amount: 4000, paid: false },
        { trip_id: "trip-3", amount: 9000, paid: false },
      ],
      commissions: [
        { trip_id: "trip-1", expected_commission: 500, commission_received: 200 },
        { trip_id: "trip-2", expected_commission: 250, commission_received: 250 },
      ],
    });

    expect(report.rows[0]).toMatchObject({
      advisorName: "Avery Advisor",
      tripCount: 1,
      bookedSales: 5000,
      clientPaymentsCollected: 1000,
      clientPaymentsDue: 4000,
      commissionExpected: 500,
      commissionReceived: 200,
      commissionDue: 300,
    });
    expect(report.rows[1]).toMatchObject({ advisorName: "Unassigned", tripCount: 1, bookedSales: 2000 });
    expect(report.totals).toMatchObject({ tripCount: 2, bookedSales: 7000, commissionDue: 300 });
  });

  it("uses the current year for invalid filters", () => {
    expect(normalizeReportYear("not-a-year", 2026)).toBe(2026);
    expect(normalizeReportYear("2025", 2026)).toBe(2025);
  });
});
