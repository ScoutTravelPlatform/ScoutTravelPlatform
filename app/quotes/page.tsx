import { createAuthorizedClient } from "@/lib/auth";
import QuoteWorkspace from "./QuoteWorkspace";

export default async function QuotesPage() {
  const supabase = await createAuthorizedClient();
  const [quotesResult, tripsResult, optionsResult] = await Promise.all([
    supabase.from("trip_quotes").select("*").order("created_at", { ascending: false }),
    supabase.from("trips").select("id, trip_name, destination, clients(first_name, last_name)").order("start_date", { ascending: true }),
    supabase.from("trip_quote_options").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);

  const trips = (tripsResult.data ?? []).map((trip) => ({
    id: trip.id,
    tripName: trip.trip_name ?? "Untitled trip",
    destination: trip.destination ?? "",
    clientName: `${trip.clients?.first_name ?? ""} ${trip.clients?.last_name ?? ""}`.trim() || "Client",
  }));
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const optionsByQuoteId = new Map<string, Array<{ id: string; quote_id: string; title: string; supplier: string; resort_name: string | null; room_option: string | null; image_url: string | null; total_amount: number; deposit_amount: number | null; is_recommended: boolean; notes: string | null; sort_order: number; created_at: string; updated_at: string }>>();
  for (const option of optionsResult.data ?? []) {
    const existing = optionsByQuoteId.get(option.quote_id) ?? [];
    existing.push(option);
    optionsByQuoteId.set(option.quote_id, existing);
  }
  const quotes = (quotesResult.data ?? []).flatMap((quote) => {
    const trip = tripById.get(quote.trip_id);
    return trip ? [{
      ...quote,
      tripName: trip.tripName,
      destination: trip.destination,
      clientName: trip.clientName,
      options: optionsByQuoteId.get(quote.id) ?? [],
    }] : [];
  });

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Sales workspace</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-[#243c57]">Quotes</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Keep pricing options, supplier details, and client decisions connected to each trip.</p>
        </header>
        {quotesResult.error ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Quotes are being prepared for this workspace. Refresh after the database update is complete.</p>
        ) : (
          <QuoteWorkspace initialQuotes={quotes} trips={trips} />
        )}
      </div>
    </main>
  );
}
