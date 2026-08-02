import { createAuthorizedClient } from "@/lib/auth";
import { communicationProviderStatus } from "@/lib/communications";
import CommunicationWorkspace from "./CommunicationWorkspace";

export default async function CommunicationsPage() {
  const supabase = await createAuthorizedClient();
  const [tripsResult, paymentsResult, messagesResult] = await Promise.all([
    supabase
      .from("trips")
      .select(`
        id,
        trip_name,
        destination,
        start_date,
        end_date,
        final_payment_date,
        clients(id,first_name,last_name,email,phone_e164,sms_consent_status)
      `)
      .order("start_date", { ascending: true }),
    supabase
      .from("booking_payments")
      .select("trip_id,payment_name,amount,due_date,paid")
      .eq("paid", false)
      .order("due_date", { ascending: true }),
    supabase
      .from("communication_drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const paymentsByTrip = new Map<string, NonNullable<typeof paymentsResult.data>[number]>();
  for (const payment of paymentsResult.data ?? []) {
    if (!paymentsByTrip.has(payment.trip_id)) paymentsByTrip.set(payment.trip_id, payment);
  }
  const trips = (tripsResult.data ?? []).flatMap((trip) => {
    if (!trip.clients) return [];
    const nextPayment = paymentsByTrip.get(trip.id);
    return [{
      id: trip.id,
      tripName: trip.trip_name ?? "Trip",
      destination: trip.destination ?? "",
      startDate: trip.start_date ?? "",
      endDate: trip.end_date ?? "",
      finalPaymentDate: trip.final_payment_date,
      clientId: trip.clients.id,
      clientFirstName: trip.clients.first_name,
      clientName: `${trip.clients.first_name} ${trip.clients.last_name}`.trim(),
      email: trip.clients.email ?? "",
      phone: trip.clients.phone_e164,
      smsConsent: trip.clients.sms_consent_status === "opted_in",
      nextPayment: nextPayment
        ? {
            name: nextPayment.payment_name ?? "Upcoming payment",
            amount: Number(nextPayment.amount),
            dueDate: nextPayment.due_date,
          }
        : null,
    }];
  });
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const messages = (messagesResult.data ?? []).map((message) => ({
    ...message,
    clientName: tripById.get(message.trip_id)?.clientName ?? "Client",
    tripName: tripById.get(message.trip_id)?.tripName ?? "Trip",
  }));

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Client care</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-[#243c57]">Communications</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Prepare, review, send, and schedule client messages with every trip detail close at hand.</p>
        </header>
        {(tripsResult.error || paymentsResult.error || messagesResult.error) ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Communications are waiting for the database update. Apply the newest Supabase migration, then refresh.</p>
        ) : (
          <CommunicationWorkspace
            trips={trips}
            initialMessages={messages}
            providers={communicationProviderStatus()}
            aiConfigured={Boolean(process.env.OPENAI_API_KEY)}
          />
        )}
      </div>
    </main>
  );
}
