export type AgencyReportTrip = {
  id: string;
  assigned_advisor_id: string | null;
  start_date: string;
  status: string | null;
  package_price: number | null;
};

export type AgencyReportPayment = {
  trip_id: string;
  amount: number;
  paid: boolean | null;
};

export type AgencyReportCommission = {
  trip_id: string;
  expected_commission: number | null;
  commission_received: number | null;
};

export type AgencyReportAdvisor = {
  userId: string;
  name: string;
  role: string;
};

export type AdvisorYearSummary = {
  key: string;
  advisorId: string | null;
  advisorName: string;
  role: string | null;
  tripCount: number;
  bookedSales: number;
  clientPaymentsScheduled: number;
  clientPaymentsCollected: number;
  clientPaymentsDue: number;
  commissionExpected: number;
  commissionReceived: number;
  commissionDue: number;
};

export type AgencyYearReport = {
  year: number;
  rows: AdvisorYearSummary[];
  totals: Omit<AdvisorYearSummary, "key" | "advisorId" | "advisorName" | "role">;
};

const emptyFinancials = () => ({
  tripCount: 0,
  bookedSales: 0,
  clientPaymentsScheduled: 0,
  clientPaymentsCollected: 0,
  clientPaymentsDue: 0,
  commissionExpected: 0,
  commissionReceived: 0,
  commissionDue: 0,
});

export function buildAgencyYearReport({
  year,
  advisors,
  trips,
  payments,
  commissions,
}: {
  year: number;
  advisors: AgencyReportAdvisor[];
  trips: AgencyReportTrip[];
  payments: AgencyReportPayment[];
  commissions: AgencyReportCommission[];
}): AgencyYearReport {
  const yearPrefix = `${year}-`;
  const yearTrips = trips.filter(
    (trip) => trip.start_date.startsWith(yearPrefix) && trip.status !== "Cancelled",
  );
  const tripById = new Map(yearTrips.map((trip) => [trip.id, trip]));
  const advisorById = new Map(advisors.map((advisor) => [advisor.userId, advisor]));
  const rows = new Map<string, AdvisorYearSummary>();

  function rowFor(advisorId: string | null) {
    const key = advisorId ?? "unassigned";
    const existing = rows.get(key);
    if (existing) return existing;
    const advisor = advisorId ? advisorById.get(advisorId) : null;
    const row: AdvisorYearSummary = {
      key,
      advisorId,
      advisorName: advisor?.name ?? (advisorId ? "Former team member" : "Unassigned"),
      role: advisor?.role ?? null,
      ...emptyFinancials(),
    };
    rows.set(key, row);
    return row;
  }

  for (const trip of yearTrips) {
    const row = rowFor(trip.assigned_advisor_id);
    row.tripCount += 1;
    row.bookedSales += Number(trip.package_price ?? 0);
  }

  for (const payment of payments) {
    const trip = tripById.get(payment.trip_id);
    if (!trip) continue;
    const row = rowFor(trip.assigned_advisor_id);
    const amount = Number(payment.amount ?? 0);
    row.clientPaymentsScheduled += amount;
    if (payment.paid) row.clientPaymentsCollected += amount;
    else row.clientPaymentsDue += amount;
  }

  for (const commission of commissions) {
    const trip = tripById.get(commission.trip_id);
    if (!trip) continue;
    const row = rowFor(trip.assigned_advisor_id);
    const expected = Number(commission.expected_commission ?? 0);
    const received = Number(commission.commission_received ?? 0);
    row.commissionExpected += expected;
    row.commissionReceived += received;
    row.commissionDue += Math.max(expected - received, 0);
  }

  const sortedRows = [...rows.values()].sort((a, b) => {
    if (a.advisorId === null) return 1;
    if (b.advisorId === null) return -1;
    return b.bookedSales - a.bookedSales || a.advisorName.localeCompare(b.advisorName);
  });
  const totals = sortedRows.reduce((total, row) => {
    total.tripCount += row.tripCount;
    total.bookedSales += row.bookedSales;
    total.clientPaymentsScheduled += row.clientPaymentsScheduled;
    total.clientPaymentsCollected += row.clientPaymentsCollected;
    total.clientPaymentsDue += row.clientPaymentsDue;
    total.commissionExpected += row.commissionExpected;
    total.commissionReceived += row.commissionReceived;
    total.commissionDue += row.commissionDue;
    return total;
  }, emptyFinancials());

  return { year, rows: sortedRows, totals };
}

export function normalizeReportYear(value: string | string[] | undefined, currentYear: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= currentYear + 10
    ? parsed
    : currentYear;
}
