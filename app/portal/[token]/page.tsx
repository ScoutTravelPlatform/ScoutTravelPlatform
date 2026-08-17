import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientPortalSchema, groupPortalItinerary } from "@/lib/client-portal";
import SandboxPaymentCardForm from "./SandboxPaymentCardForm";
import AuthorizeExistingCardForm from "./AuthorizeExistingCardForm";
import ClientQuoteDecision from "./ClientQuoteDecision";

export const metadata: Metadata = { title: "Your Trip | Scout Travel", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_portal", { portal_token: token });
  const parsed = clientPortalSchema.safeParse(data);
  if (error || !parsed.success) notFound();
  const portal = parsed.data; const days = groupPortalItinerary(portal.itinerary_items);

  return <main className="min-h-screen w-full bg-[#f6f8f7] text-slate-900">
    <header className="border-b border-sky-200 bg-gradient-to-br from-sky-100 to-[#e8eef0] px-6 py-12"><div className="mx-auto max-w-5xl"><p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">{portal.trip.organization_name}</p><h1 className="mt-4 text-4xl font-bold md:text-5xl">{portal.trip.trip_name}</h1><p className="mt-3 text-xl text-slate-600">{portal.trip.destination}</p><p className="mt-6 font-semibold">{formatDate(portal.trip.start_date)} - {formatDate(portal.trip.end_date)}</p></div></header>
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Traveler" value={portal.trip.client_name} /><Detail label="Supplier" value={portal.trip.supplier || "To be confirmed"} /><Detail label="Resort or hotel" value={portal.trip.resort_hotel || "To be confirmed"} /><Detail label="Confirmation" value={portal.trip.booking_number || "To be confirmed"} /></section>
      {portal.quotes.length > 0 && <ClientQuoteDecision token={token} initialQuotes={portal.quotes} />}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Your Vacation</p><h2 className="mt-2 text-3xl font-bold">Day-by-Day Itinerary</h2></div><a href={`/api/portal/${token}/itinerary`} className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-center font-semibold text-sky-800 hover:bg-sky-100">Download Printable PDF</a></div>
        <div className="mt-8 space-y-8">{days.length ? days.map(([date, items]) => <div key={date}><h3 className="rounded-xl bg-sky-100 px-4 py-3 text-lg font-bold text-sky-900">{formatDay(date)}</h3><div className="mt-3 space-y-3">{items.map((item, index) => <article key={`${date}-${item.title}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-[#f6f8f7] p-5 sm:grid-cols-[90px_1fr]"><p className="font-bold text-sky-700">{formatTime(item.start_time)}</p><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold">{item.title}</h4><span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">{item.category}</span></div>{item.location && <p className="mt-1 text-slate-600">{item.location}</p>}{item.confirmation_number && <p className="mt-2 text-sm font-semibold">Confirmation: {item.confirmation_number}</p>}{item.notes && <p className="mt-3 leading-7 text-slate-600">{item.notes}</p>}</div></article>)}</div></div>) : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center"><p className="font-semibold">Your daily plans are being prepared.</p><p className="mt-2 text-sm text-slate-600">Check back soon for parks, dining, activities, and reservations.</p></div>}</div>
      </section>
      {portal.important_dates.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8"><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Coming Up</p><h2 className="mt-2 text-2xl font-bold">Important Trip Dates</h2><div className="mt-6 grid gap-3 md:grid-cols-2">{portal.important_dates.map((event, index) => <article key={`${event.title}-${index}`} className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4"><p className="text-sm font-bold text-sky-700">{event.event_date ? formatDate(event.event_date) : "Date to be confirmed"}</p><h3 className="mt-2 font-bold">{event.title}</h3>{event.description && <p className="mt-2 text-sm leading-6 text-slate-600">{event.description}</p>}</article>)}</div></section>}
      {process.env.NEXT_PUBLIC_VGS_ENVIRONMENT === "sandbox" && <>
        {portal.payment_credentials.length > 0 && <AuthorizeExistingCardForm token={token} cards={portal.payment_credentials} defaultSupplier={portal.trip.supplier ?? "Disney"} />}
        <SandboxPaymentCardForm token={token} defaultSupplier={portal.trip.supplier ?? "Disney"} />
      </>}
      <footer className="py-6 text-center text-sm text-slate-500">Prepared for {portal.trip.client_name} by {portal.trip.organization_name}.</footer>
    </div>
  </main>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>; }
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); }
function formatDay(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); }
function formatTime(value: string | null) { if (!value) return "Flexible"; const [hour, minute] = value.split(":").map(Number); return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
