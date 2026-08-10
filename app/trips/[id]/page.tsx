import Link from "next/link";
import { notFound } from "next/navigation";
import { createAuthorizedClient } from "../../../lib/auth";
import BookingTasks from "./BookingTasks";
import PaymentTracker from "./PaymentTracker";
import CommissionCenter from "./CommissionCenter";
import ClientTimeline from "./ClientTimeline";
import DailyItineraryPlanner from "./DailyItineraryPlanner";
import ClientPortalManager from "./ClientPortalManager";
import AdvisorAssignment from "./AdvisorAssignment";
import DeleteTripButton from "../DeleteTripButton";
import { isDisneyTrip } from "../../../lib/disney-timeline";

type BookingWorkspacePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingWorkspacePage({
  params,
}: BookingWorkspacePageProps) {
  const { id } = await params;
  const supabase = await createAuthorizedClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", id)
    .single();

  if (error || !trip) {
    notFound();
  }

  const { data: authData } = await supabase.auth.getUser();
  const [{ data: membership }, { data: teamData }] = await Promise.all([
    authData.user
      ? supabase.from("organization_memberships").select("role").eq("organization_id", trip.organization_id).eq("user_id", authData.user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc("get_organization_team", { target_organization_id: trip.organization_id }),
  ]);
  const team = (teamData ?? []).map((member) => ({
    userId: member.user_id,
    name: member.full_name || member.email || "Team member",
    role: member.role,
  }));
  const canAssignAdvisor = membership?.role === "owner" || membership?.role === "admin";

  const { data: tasks, error: tasksError } = await supabase
    .from("booking_tasks")
    .select("*")
    .eq("trip_id", id)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true });

  if (tasksError) {
    console.error("Could not load booking tasks:", tasksError.message);
  }
const { data: payments, error: paymentsError } = await supabase
  .from("booking_payments")
  .select("*")
  .eq("trip_id", id)
  .order("due_date", { ascending: true });
if (paymentsError) {
  console.error(
    "Could not load booking payments:",
    paymentsError.message
  );
}
const { data: commissions, error: commissionsError } = await supabase
  .from("booking_commissions")
  .select("*")
  .eq("trip_id", id)
  .order("created_at", { ascending: true });

if (commissionsError) {
  console.error(
    "Could not load booking commissions:",
    commissionsError.message
  );
}
const { data: timelineEvents, error: timelineEventsError } =
  await supabase
    .from("booking_timeline_events")
    .select("*")
    .eq("trip_id", id)
    .order("event_date", { ascending: true });

if (timelineEventsError) {
  console.error(
    "Could not load timeline events:",
    timelineEventsError.message
  );
}
const { data: itineraryItems, error: itineraryItemsError } = await supabase
  .from("itinerary_items")
  .select("*")
  .eq("trip_id", id)
  .order("item_date", { ascending: true })
  .order("start_time", { ascending: true });
if (itineraryItemsError) {
  console.error("Could not load itinerary items:", itineraryItemsError.message);
}
const { data: portalLink, error: portalLinkError } = await supabase
  .from("client_portal_links")
  .select("expires_at,revoked_at")
  .eq("trip_id", id)
  .maybeSingle();
if (portalLinkError) {
  console.error("Could not load client portal status:", portalLinkError.message);
}
const portalIsActive = Boolean(
  portalLink && !portalLink.revoked_at && new Date(portalLink.expires_at).getTime() > new Date().getTime()
);
  const formatMoney = (amount: number | string | null) => {
    if (amount == null) {
      return "—";
    }

    return Number(amount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) {
      return "—";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const today = new Date();

  const startDate = trip.start_date
    ? new Date(`${trip.start_date}T00:00:00`)
    : null;

  const daysUntilTravel = startDate
    ? Math.ceil(
        (startDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const bookingChecklist = [
    {
      label: "Client information",
      complete: Boolean(
        trip.clients?.first_name &&
          trip.clients?.last_name &&
          trip.clients?.email
      ),
    },
    {
      label: "Supplier selected",
      complete: Boolean(trip.supplier),
    },
    {
      label: "Resort or hotel added",
      complete: Boolean(trip.resort_hotel),
    },
    {
      label: "Booking number added",
      complete: Boolean(trip.booking_number),
    },
    {
      label: "Travel dates added",
      complete: Boolean(trip.start_date && trip.end_date),
    },
    {
      label: "Final payment date added",
      complete: Boolean(trip.final_payment_date),
    },
  ];

  const completedItems = bookingChecklist.filter(
    (item) => item.complete
  ).length;

  const progressPercentage = Math.round(
    (completedItems / bookingChecklist.length) * 100
  );

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Link
            href={`/clients/${trip.client_id}`}
            className="text-sm font-medium text-sky-700 hover:text-sky-700"
          >
            ← Back to Client
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={`/api/trips/${trip.id}/itinerary`} className="rounded-lg border border-sky-300 bg-sky-50 px-5 py-3 text-center font-semibold text-sky-800 hover:bg-sky-100">
              Print Day-by-Day Itinerary
            </a>
            <Link href={`/trips/${trip.id}/edit`} className="rounded-lg bg-sky-500 px-5 py-3 text-center font-semibold text-white hover:bg-sky-400">
              Edit Booking
            </Link>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                Booking Workspace
              </p>

              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {trip.trip_name}
              </h1>

              <p className="mt-3 text-lg text-slate-600">
                {trip.destination}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-slate-300 bg-[#f6f8f7] px-4 py-2">
                  {trip.clients.first_name} {trip.clients.last_name}
                </span>

                <span className="rounded-full border border-slate-300 bg-[#f6f8f7] px-4 py-2">
                  {trip.adults ?? 0} adults
                </span>

                <span className="rounded-full border border-slate-300 bg-[#f6f8f7] px-4 py-2">
                  {trip.children ?? 0} children
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
                {trip.status || "Planning"}
              </span>

              {daysUntilTravel !== null && (
                <p className="text-sm text-slate-600">
                  {daysUntilTravel > 0
                    ? `${daysUntilTravel} days until travel`
                    : daysUntilTravel === 0
                      ? "Travel begins today"
                      : "Travel date has passed"}
                </p>
              )}
              <AdvisorAssignment tripId={trip.id} initialAdvisorId={trip.assigned_advisor_id} team={team} canManage={canAssignAdvisor} />
              <DeleteTripButton tripId={trip.id} tripName={trip.trip_name ?? "this trip"} redirectTo="/trips" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Travel Dates</p>

            <p className="mt-2 font-semibold">
              {formatDate(trip.start_date)}
            </p>

            <p className="text-sm text-slate-600">
              to {formatDate(trip.end_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Final Payment</p>

            <p className="mt-2 font-semibold">
              {formatDate(trip.final_payment_date)}
            </p>

            <p className="text-sm text-slate-600">
              Payment deadline
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Package Value</p>

            <p className="mt-2 text-xl font-bold">
              {formatMoney(trip.package_price)}
            </p>

            <p className="text-sm text-slate-600">
              Total booking value
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Commission</p>

            <p className="mt-2 text-xl font-bold">
              {formatMoney(trip.commission_amount)}
            </p>

            <p className="text-sm text-slate-600">
              Estimated earnings
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    Booking Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Main reservation and supplier information.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                  <p className="text-sm text-slate-500">
                    Client
                  </p>

                  <p className="mt-1 font-semibold">
                    {trip.clients.first_name}{" "}
                    {trip.clients.last_name}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {trip.clients.email}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                  <p className="text-sm text-slate-500">
                    Supplier
                  </p>

                  <p className="mt-1 font-semibold">
                    {trip.supplier || "Not added"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                  <p className="text-sm text-slate-500">
                    Resort or Hotel
                  </p>

                  <p className="mt-1 font-semibold">
                    {trip.resort_hotel || "Not added"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                  <p className="text-sm text-slate-500">
                    Room Option
                  </p>

                  <p className="mt-1 font-semibold">
                    {trip.room_option || "Not added"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                  <p className="text-sm text-slate-500">
                    Booking Number
                  </p>

                  <p className="mt-1 font-semibold">
                    {trip.booking_number || "Not added"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-bold">
                Booking Timeline
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Important dates for this reservation.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-sky-500" />

                  <div>
                    <p className="font-semibold">
                      Booking created
                    </p>

                    <p className="text-sm text-slate-600">
                      Reservation added to Scout
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-400" />

                  <div>
                    <p className="font-semibold">
                      Final payment due
                    </p>

                    <p className="text-sm text-slate-600">
                      {formatDate(trip.final_payment_date)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-emerald-400" />

                  <div>
                    <p className="font-semibold">
                      Travel begins
                    </p>

                    <p className="text-sm text-slate-600">
                      {formatDate(trip.start_date)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-purple-400" />

                  <div>
                    <p className="font-semibold">
                      Travel ends
                    </p>

                    <p className="text-sm text-slate-600">
                      {formatDate(trip.end_date)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <BookingTasks
              tripId={trip.id}
              initialTasks={(tasks ?? []).map((task) => ({ ...task, title: task.title ?? "Task", completed: task.completed ?? false }))}
            />
            <PaymentTracker
  tripId={trip.id}
  packagePrice={Number(trip.package_price ?? 0)}
  initialPayments={(payments ?? []).map((payment) => ({ ...payment, payment_name: payment.payment_name ?? "Payment", amount: payment.amount ?? 0 }))}
/>
<CommissionCenter
  tripId={trip.id}
  tripValue={Number(trip.package_price ?? 0)}
  defaultSupplier={trip.supplier ?? ""}
  initialCommissions={commissions ?? []}
/>
<DailyItineraryPlanner
  tripId={trip.id}
  startDate={trip.start_date ?? ""}
  initialItems={itineraryItems ?? []}
/>
<ClientPortalManager
  tripId={trip.id}
  initialActive={portalIsActive}
  initialExpiresAt={portalIsActive ? portalLink?.expires_at ?? null : null}
/>
<ClientTimeline
  tripId={trip.id}
  initialEvents={timelineEvents ?? []}
  isDisneyTrip={isDisneyTrip([trip.trip_name, trip.destination, trip.supplier, trip.resort_hotel])}
/>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Booking Progress
                </h2>

                <span className="text-sm font-semibold text-sky-700">
                  {progressPercentage}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#edf3f2]">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-600">
                {completedItems} of {bookingChecklist.length} booking
                details completed
              </p>

              <div className="mt-6 space-y-3">
                {bookingChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f6f8f7] p-3"
                  >
                    <span className="text-sm">
                      {item.label}
                    </span>

                    <span className={`grid h-6 w-6 place-items-center rounded-full border ${item.complete ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-400"}`} aria-label={item.complete ? "Complete" : "Incomplete"}>
                      {item.complete ? <CheckIcon /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
                Scout Intelligence
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Booking Review
              </h2>

              <div className="mt-5 space-y-3">
                {!trip.final_payment_date && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-700">
                      Missing payment date
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Add a final payment date so Scout can track the
                      deadline.
                    </p>
                  </div>
                )}

                {!trip.booking_number && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-700">
                      Missing booking number
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Add the supplier confirmation number.
                    </p>
                  </div>
                )}

                {trip.final_payment_date &&
                  trip.booking_number && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-700">
                        Booking looks good
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Scout did not find any immediate issues.
                      </p>
                    </div>
                  )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m4 10 4 4 8-9" /></svg>;
}
