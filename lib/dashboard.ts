export type DashboardTrip = {
  id: string;
  trip_name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  final_payment_date: string | null;
  supplier: string | null;
  booking_number: string | null;
  status: string | null;
};

export type DashboardTask = {
  due_date: string | null;
  completed: boolean | null;
};

export type DashboardPayment = {
  due_date: string | null;
  paid: boolean | null;
};

export type DashboardCommission = {
  expected_pay_date: string | null;
  expected_commission: number | null;
  commission_received: number | null;
};

export type HottestLead = {
  quoteId: string;
  tripId: string;
  title: string;
  clientName: string;
  tripName: string;
  totalViews: number;
  totalTimeOnPage: number;
  mostFavoritedOption: string | null;
  engagementScore: number;
};

export type HottestLeadQuote = {
  id: string;
  tripId: string;
  title: string;
  clientName: string;
  tripName: string;
};

export type HottestLeadView = {
  quoteId: string;
  count: number;
  totalTimeOnPage: number;
};

export type HottestLeadInteraction = {
  quoteId: string;
  optionTitle: string;
  interactionType: string;
  count: number;
};

export function getDashboardMetrics({
  trips,
  tasks,
  payments,
  commissions,
  today,
}: {
  trips: DashboardTrip[];
  tasks: DashboardTask[];
  payments: DashboardPayment[];
  commissions: DashboardCommission[];
  today: string;
}) {
  const sevenDays = addDays(today, 7);
  const sixtyDays = addDays(today, 60);

  const overdueTasks = tasks.filter(
    (task) => !task.completed && task.due_date && task.due_date < today
  ).length;
  const overduePayments = payments.filter(
    (payment) => !payment.paid && payment.due_date && payment.due_date < today
  ).length;
  const paymentsDueSoon = payments.filter(
    (payment) =>
      !payment.paid &&
      payment.due_date &&
      payment.due_date >= today &&
      payment.due_date <= sevenDays
  ).length;
  const incompleteBookings = trips.filter(
    (trip) => !trip.supplier || !trip.booking_number || !trip.final_payment_date
  ).length;
  const overdueCommissions = commissions.filter(
    (commission) =>
      commission.expected_pay_date &&
      commission.expected_pay_date < today &&
      Number(commission.commission_received ?? 0) <
        Number(commission.expected_commission ?? 0)
  ).length;
  const upcomingTrips = trips.filter(
    (trip) =>
      trip.start_date && trip.start_date >= today && trip.start_date <= sixtyDays
  ).length;

  return {
    overdueActions: overdueTasks + overduePayments,
    overdueTasks,
    overduePayments,
    paymentsDueSoon,
    incompleteBookings,
    overdueCommissions,
    upcomingTrips,
  };
}

export function getHottestLeads({
  quotes,
  views,
  interactions,
}: {
  quotes: HottestLeadQuote[];
  views: HottestLeadView[];
  interactions: HottestLeadInteraction[];
}): HottestLead[] {
  const viewByQuote = new Map<string, HottestLeadView>();
  for (const view of views) {
    const existing = viewByQuote.get(view.quoteId);
    viewByQuote.set(view.quoteId, {
      quoteId: view.quoteId,
      count: (existing?.count ?? 0) + view.count,
      totalTimeOnPage: (existing?.totalTimeOnPage ?? 0) + view.totalTimeOnPage,
    });
  }

  const favoriteByQuote = new Map<string, { title: string; count: number }>();
  for (const interaction of interactions) {
    if (interaction.interactionType !== "favorite") continue;
    const existing = favoriteByQuote.get(interaction.quoteId);
    favoriteByQuote.set(interaction.quoteId, {
      title: interaction.optionTitle,
      count: (existing?.count ?? 0) + interaction.count,
    });
  }

  return quotes
    .map((quote) => {
      const view = viewByQuote.get(quote.id);
      const favorite = favoriteByQuote.get(quote.id);
      const totalViews = view?.count ?? 0;
      const totalTimeOnPage = view?.totalTimeOnPage ?? 0;
      return {
        quoteId: quote.id,
        tripId: quote.tripId,
        title: quote.title,
        clientName: quote.clientName,
        tripName: quote.tripName,
        totalViews,
        totalTimeOnPage,
        mostFavoritedOption: favorite ? favorite.title : null,
        engagementScore: totalViews + (favorite ? favorite.count : 0),
      };
    })
    .sort((a, b) => b.engagementScore - a.engagementScore || b.totalViews - a.totalViews || a.title.localeCompare(b.title));
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
