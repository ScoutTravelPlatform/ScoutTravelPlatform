import Link from "next/link";
import { createAuthorizedClient } from "@/lib/auth";
import { getDashboardMetrics, getHottestLeads } from "@/lib/dashboard";
import { getPrioritizedWorkQueue, normalizeWorkQueueView, type WorkQueueItem } from "@/lib/dashboard-work-queue";

type Props = { searchParams: Promise<{ view?: string | string[] }> };

export default async function Home({ searchParams }: Props) {
  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  const [profile, membership, tripsResult, tasks, payments, commissions, timeline, quotesResult, quoteViewsResult, interactionsResult, quoteOptionsResult] = await Promise.all([
    authData.user ? supabase.from("profiles").select("full_name").eq("id", authData.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("organization_memberships").select("organization_id, role").limit(1).maybeSingle(),
    supabase.from("trips").select("id, trip_name, destination, start_date, end_date, final_payment_date, supplier, booking_number, status, clients(first_name, last_name)").order("start_date", { ascending: true }),
    supabase.from("booking_tasks").select("id, trip_id, title, due_date, completed"),
    supabase.from("booking_payments").select("id, trip_id, payment_name, amount, due_date, paid"),
    supabase.from("booking_commissions").select("id, trip_id, supplier, expected_pay_date, expected_commission, commission_received"),
    supabase.from("booking_timeline_events").select("id, trip_id, event_type, title, description, event_date, status").eq("status", "Upcoming"),
    supabase.from("trip_quotes").select("id, title, trip_id").order("created_at", { ascending: false }),
    supabase.from("trip_quote_views").select("quote_id, time_on_page_seconds"),
    supabase.from("trip_quote_option_interactions").select("quote_id, option_id, interaction_type"),
    supabase.from("trip_quote_options").select("id, quote_id, title"),
  ]);
  const organization = membership.data ? await supabase.from("organizations").select("name").eq("id", membership.data.organization_id).maybeSingle() : { data: null, error: null };
  const trips = (tripsResult.data ?? []).map((trip) => ({ ...trip, trip_name: trip.trip_name ?? "Untitled trip", destination: trip.destination ?? "" }));
  const today = new Date().toISOString().slice(0, 10);
  const metrics = getDashboardMetrics({ trips, tasks: tasks.data ?? [], payments: payments.data ?? [], commissions: commissions.data ?? [], today });
  const upcoming = trips.filter((trip) => trip.start_date && trip.start_date >= today).slice(0, 5);
  const view = normalizeWorkQueueView((await searchParams).view);
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const workItems: WorkQueueItem[] = [];
  const contextFor = (tripId: string) => {
    const trip = tripById.get(tripId);
    return trip ? { tripName: trip.trip_name, clientName: `${trip.clients?.first_name ?? ""} ${trip.clients?.last_name ?? ""}`.trim() || "Client" } : null;
  };
  for (const task of tasks.data ?? []) {
    const context = contextFor(task.trip_id);
    if (!task.completed && task.due_date && context) workItems.push({ id: `task-${task.id}`, tripId: task.trip_id, category: "task", title: task.title ?? "Task", dueDate: task.due_date, detail: "Advisor task", ...context });
  }
  for (const payment of payments.data ?? []) {
    const context = contextFor(payment.trip_id);
    if (!payment.paid && payment.due_date && context) workItems.push({ id: `payment-${payment.id}`, tripId: payment.trip_id, category: "payment", title: payment.payment_name ?? "Payment", dueDate: payment.due_date, detail: `${formatCurrency(payment.amount ?? 0)} client payment`, ...context });
  }
  for (const event of timeline.data ?? []) {
    const context = contextFor(event.trip_id);
    if (event.event_date && context) workItems.push({ id: `timeline-${event.id}`, tripId: event.trip_id, category: "timeline", title: event.title, dueDate: event.event_date, detail: event.description || `${event.event_type} timeline event`, ...context });
  }
  for (const commission of commissions.data ?? []) {
    const context = contextFor(commission.trip_id);
    if (commission.expected_pay_date && Number(commission.commission_received ?? 0) < Number(commission.expected_commission ?? 0) && context) workItems.push({ id: `commission-${commission.id}`, tripId: commission.trip_id, category: "commission", title: "Commission follow-up", dueDate: commission.expected_pay_date, detail: `${commission.supplier || "Supplier"} · ${formatCurrency(commission.expected_commission ?? 0)} expected`, ...context });
  }
  for (const trip of trips) {
    const clientName = `${trip.clients?.first_name ?? ""} ${trip.clients?.last_name ?? ""}`.trim() || "Client";
    if (trip.start_date && trip.start_date >= today) workItems.push({ id: `departure-${trip.id}`, tripId: trip.id, category: "departure", title: "Client departure", dueDate: trip.start_date, detail: trip.destination, tripName: trip.trip_name, clientName });
    if (trip.start_date && trip.start_date >= today && (!trip.supplier || !trip.booking_number || !trip.final_payment_date)) {
      const missing = [!trip.supplier && "supplier", !trip.booking_number && "confirmation", !trip.final_payment_date && "final payment date"].filter(Boolean).join(", ");
      workItems.push({ id: `booking-${trip.id}`, tripId: trip.id, category: "booking", title: "Complete booking details", dueDate: today, detail: `Missing ${missing}`, tripName: trip.trip_name, clientName });
    }
  }
  const queue = getPrioritizedWorkQueue(workItems, today, view).slice(0, 25);
  const optionTitlesById = new Map((quoteOptionsResult.data ?? []).map((option: { id: string; title: string }) => [option.id, option.title]));
  const hottestLeads = getHottestLeads({
    quotes: (quotesResult.data ?? []).map((quote) => ({
      id: quote.id,
      tripId: quote.trip_id,
      title: quote.title,
      clientName: contextFor(quote.trip_id)?.clientName ?? "Client",
      tripName: contextFor(quote.trip_id)?.tripName ?? "Trip",
    })),
    views: (quoteViewsResult.data ?? []).map((view: { quote_id: string; time_on_page_seconds: number | null }) => ({
      quoteId: view.quote_id,
      count: 1,
      totalTimeOnPage: Number(view.time_on_page_seconds ?? 0),
    })),
    interactions: (interactionsResult.data ?? []).map((interaction: { quote_id: string; option_id: string; interaction_type: string }) => ({
      quoteId: interaction.quote_id,
      optionTitle: optionTitlesById.get(interaction.option_id) ?? "Option",
      interactionType: interaction.interaction_type,
      count: 1,
    })),
  }).slice(0, 5);
  const advisorName = profile.data?.full_name || authData.user?.email?.split("@")[0] || "Advisor";
  const cards = [
    ["Overdue Actions", metrics.overdueActions, `${metrics.overdueTasks} tasks and ${metrics.overduePayments} payments overdue`],
    ["Payments Due", metrics.paymentsDueSoon, "Unpaid client payments due within 7 days"],
    ["Booking Review", metrics.incompleteBookings, "Trips missing important booking details"],
    ["Commissions", metrics.overdueCommissions, "Expected commissions past their payment date"],
  ] as const;
  return <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-white uppercase tracking-[0.25em] text-sky-700">{organization.data?.name ?? "Scout Travel"}</p><h1 className="mt-2 text-3xl font-bold">Welcome back, {advisorName}</h1><p className="mt-2 text-slate-600">Here is what needs your attention today.</p>{membership.data && <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">{membership.data.role}</p>}</div><Link href="/add-client" className="rounded-xl bg-sky-600 px-5 py-3 text-center font-semibold text-white hover:bg-sky-500">Add New Client</Link></header>
    <section className="py-8"><h2 className="text-xl font-semibold">Today&apos;s Priorities</h2><p className="mt-1 text-sm text-slate-600">Scout organized your most important actions.</p><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{cards.map(([title,count,description]) => <Link href="/trips" key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"><div className="flex items-start justify-between"><h3 className="font-semibold">{title}</h3><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">View</span></div><p className="mt-5 text-4xl font-bold">{count}</p><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></Link>)}</div></section>
    <section className="pb-8"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Advisor work queue</p><h2 className="mt-1 text-2xl font-bold">What needs attention</h2><p className="mt-1 text-sm text-slate-600">One prioritized list across every active trip.</p></div><nav aria-label="Work queue filters" className="flex flex-wrap gap-2">{([['all','All'],['overdue','Overdue'],['today','Today'],['week','Next 7 days']] as const).map(([value,label]) => <Link key={value} href={value === 'all' ? '/dashboard' : `/dashboard?view=${value}`} className={`rounded-full border px-4 py-2 text-sm font-semibold ${view === value ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300'}`}>{label}</Link>)}</nav></div></div>{queue.length ? <div className="divide-y divide-slate-200">{queue.map((item) => <Link key={item.id} href={`/trips/${item.tripId}`} className="grid gap-3 px-6 py-5 transition hover:bg-sky-50/70 md:grid-cols-[140px_1fr_auto] md:items-center"><div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${timingClasses(item.timing)}`}>{timingLabel(item.daysUntilDue)}</span><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{categoryLabel(item.category)}</p></div><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.clientName} · {item.tripName}</p><p className="mt-1 text-sm text-slate-500">{item.detail}</p></div><div className="text-left md:text-right"><p className="font-semibold">{formatDate(item.dueDate)}</p><p className="mt-1 text-sm font-semibold text-sky-700">Open trip →</p></div></Link>)}</div> : <div className="p-10 text-center"><p className="font-semibold">Nothing needs attention in this view.</p><p className="mt-2 text-sm text-slate-600">Scout will add work here as deadlines approach.</p></div>}</div></section>
    <section className="pb-8"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Client engagement</p><h2 className="mt-1 text-2xl font-bold">Hottest leads</h2><p className="mt-1 text-sm text-slate-600">Quotes ranked by how much the client is actually engaging with them, not just pipeline value.</p></div>{hottestLeads.length ? <div className="divide-y divide-slate-200">{hottestLeads.map((lead) => <Link key={lead.quoteId} href={`/trips/${lead.tripId}`} className="grid gap-3 px-6 py-5 transition hover:bg-sky-50/70 md:grid-cols-[1fr_auto] md:items-center"><div><h3 className="font-bold">{lead.title}</h3><p className="mt-1 text-sm text-slate-600">{lead.clientName} · {lead.tripName}</p>{lead.mostFavoritedOption && <p className="mt-1 text-sm font-semibold text-sky-700">Favorite: {lead.mostFavoritedOption}</p>}</div><div className="flex gap-4 text-left md:text-right"><div><p className="text-lg font-bold">{lead.totalViews}</p><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lead.totalViews === 1 ? "view" : "views"}</p></div><div><p className="text-lg font-bold">{formatDuration(lead.totalTimeOnPage)}</p><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">time on page</p></div></div></Link>)}</div> : <div className="p-10 text-center"><p className="font-semibold">No client engagement yet.</p><p className="mt-2 text-sm text-slate-600">Scout will rank quotes here once clients start viewing and favoriting options in the portal.</p></div>}</div></section>
    <section className="grid gap-6 pb-10 lg:grid-cols-3"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold">Upcoming Trips</h2><p className="mt-1 text-sm text-slate-600">Your next client departures.</p></div>{upcoming.length ? <div className="divide-y divide-slate-200">{upcoming.map((trip) => <Link key={trip.id} href={`/trips/${trip.id}`} className="flex flex-col gap-3 px-6 py-5 hover:bg-sky-50/60 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{trip.trip_name}</p><p className="mt-1 text-sm text-slate-600">{trip.clients?.first_name} {trip.clients?.last_name} · {trip.destination}</p></div><span className="w-fit rounded-full border border-slate-200 bg-[#f6f8f7] px-3 py-1 text-xs font-semibold text-slate-700">{formatDate(trip.start_date ?? "")}</span></Link>)}</div> : <p className="p-8 text-slate-600">No upcoming trips yet.</p>}</div><aside className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-amber-50 p-6"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Scout Intelligence</p><h2 className="mt-3 text-2xl font-bold">{trips.length} trips in Scout</h2><p className="mt-3 leading-7 text-slate-600">Use the trip workspace to manage deadlines, payments, commissions, and Smart Timelines.</p><Link href="/trips" className="mt-6 inline-block font-semibold text-sky-700 hover:text-sky-600">Open all trips →</Link></aside></section>
  </div></main>;
}

function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value)); }
function formatDuration(totalSeconds: number) { const minutes = Math.round(totalSeconds / 60); if (minutes < 1) return `${totalSeconds}s`; if (minutes < 60) return `${minutes}m`; return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
function categoryLabel(category: WorkQueueItem["category"]) { return ({ task: "Task", payment: "Payment", timeline: "Timeline", booking: "Booking", departure: "Departure", commission: "Commission" })[category]; }
function timingLabel(days: number) { if (days < 0) return `${Math.abs(days)}d overdue`; if (days === 0) return "Today"; if (days === 1) return "Tomorrow"; return `In ${days} days`; }
function timingClasses(timing: "overdue" | "today" | "week" | "later") { return timing === "overdue" ? "bg-rose-100 text-rose-800" : timing === "today" ? "bg-amber-100 text-amber-800" : timing === "week" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"; }
