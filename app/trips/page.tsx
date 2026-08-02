import Link from "next/link";
import { createAuthorizedClient } from "@/lib/auth";
import DeleteTripButton from "./DeleteTripButton";

type TripsPageProps = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function TripsPage({ searchParams }: TripsPageProps) {
  const { q = "", status = "all" } = await searchParams;
  const search = q.trim().slice(0, 100).toLowerCase();
  const supabase = await createAuthorizedClient();
  const { data, error } = await supabase.from("trips")
    .select("id, trip_name, destination, supplier, booking_number, start_date, end_date, final_payment_date, package_price, commission_amount, status, clients(first_name, last_name)")
    .order("start_date", { ascending: true }).limit(200);
  const allTrips = data ?? [];
  const statuses = Array.from(new Set(allTrips.map((trip) => trip.status).filter((s): s is string => Boolean(s)))).sort();
  const trips = allTrips.filter((trip) => {
    const text = [trip.trip_name, trip.destination, trip.supplier, trip.booking_number, trip.clients?.first_name, trip.clients?.last_name].filter(Boolean).join(" ").toLowerCase();
    return (status === "all" || trip.status === status) && (!search || text.includes(search));
  });
  const totalValue = trips.reduce((sum, trip) => sum + Number(trip.package_price ?? 0), 0);
  const totalCommission = trips.reduce((sum, trip) => sum + Number(trip.commission_amount ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Operations</p><h1 className="mt-2 text-4xl font-bold">Trips</h1><p className="mt-2 text-slate-600">Search and manage every booking in your organization.</p></div>
          <Link href="/clients" className="rounded-xl bg-sky-600 px-5 py-3 text-center font-semibold text-white hover:bg-sky-500">Add Trip from Client</Link>
        </header>
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Visible trips" value={String(trips.length)} /><Metric label="Package value" value={formatMoney(totalValue)} /><Metric label="Estimated commission" value={formatMoney(totalCommission)} />
        </section>
        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="trip-search">Search trips</label><input id="trip-search" name="q" defaultValue={q} placeholder="Search client, destination, supplier, or confirmation" className="rounded-lg border border-slate-300 bg-[#f6f8f7] px-4 py-3 outline-none focus:border-sky-500" />
          <label className="sr-only" htmlFor="trip-status">Trip status</label><select id="trip-status" name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-[#f6f8f7] px-4 py-3 outline-none focus:border-sky-500"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500">Filter</button>
        </form>
        {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">Trips could not be loaded. Refresh to try again.</p>}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4 text-sm text-slate-600">{trips.length} matching trip{trips.length === 1 ? "" : "s"}</div>
          {trips.length ? <div className="divide-y divide-slate-200">{trips.map((trip) => (
            <div key={trip.id} className="grid gap-4 px-6 py-5 hover:bg-sky-50/60 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto] lg:items-center">
              <Link href={`/trips/${trip.id}`} className="contents">
                <div><p className="font-semibold">{trip.trip_name}</p><p className="mt-1 text-sm text-slate-600">{trip.clients?.first_name} {trip.clients?.last_name} · {trip.destination}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-500">Travel</p><p className="mt-1 text-sm">{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-slate-500">Value</p><p className="mt-1 text-sm">{formatMoney(Number(trip.package_price ?? 0))}</p></div>
                <span className="w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">{trip.status}</span>
              </Link>
              <DeleteTripButton tripId={trip.id} tripName={trip.trip_name ?? "this trip"} />
            </div>
          ))}</div> : <div className="p-10 text-center text-slate-600">No trips match those filters.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function formatMoney(value: number) { return value.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
