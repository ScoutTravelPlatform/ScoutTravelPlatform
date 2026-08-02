import Link from "next/link";
import { notFound } from "next/navigation";
import { createAuthorizedClient } from "../../../lib/auth";
import ClientProfileEditor from "./ClientProfileEditor";
import DeleteClientButton from "../DeleteClientButton";
import ClientIntakeManager from "./ClientIntakeManager";

type ClientProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientProfilePage({
  params,
}: ClientProfilePageProps) {
  const { id } = await params;
  const supabase = await createAuthorizedClient();

  const [{ data: client, error }, { data: paymentCredentials }, { data: travelers }, { data: celebrations }, { data: intakeLink }] = await Promise.all([
    supabase
    .from("clients")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone_e164,
      notes,
      sms_consent_status,
      created_at,
      travel_style,
      room_preferences,
      favorite_resorts,
      favorite_cruise_lines,
      favorite_airlines,
      trips (
        id,
        trip_name,
        destination,
        supplier,
        resort_hotel,
        booking_number,
        start_date,
        end_date,
        final_payment_date,
        package_price,
        commission_amount,
        adults,
        children,
        status
      )
    `)
    .eq("id", id)
    .single(),
    supabase
      .from("payment_credentials")
      .select("id,display_label,brand,last_four,expiration_month,expiration_year,status,cvc_expires_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_travelers")
      .select("*, client_loyalty_programs(*)")
      .eq("client_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("client_celebrations")
      .select("*")
      .eq("client_id", id)
      .order("occasion_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("client_intake_links")
      .select("expires_at,revoked_at")
      .eq("client_id", id)
      .maybeSingle(),
  ]);

  if (error || !client) {
    notFound();
  }

  const intakeIsActive = Boolean(
    intakeLink && !intakeLink.revoked_at && new Date(intakeLink.expires_at).getTime() > new Date().getTime()
  );

  const joinedDate = new Date(client.created_at ?? "1970-01-01T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/clients"
          className="text-sm font-medium text-sky-700 hover:text-sky-700"
        >
          ← Back to Clients
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">
                Client Profile
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                {client.first_name} {client.last_name}
              </h1>

              <p className="mt-2 text-slate-600">{client.email}</p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <ClientProfileEditor client={{
                id: client.id,
                firstName: client.first_name,
                lastName: client.last_name ?? "",
                email: client.email ?? "",
                phone: client.phone_e164,
                notes: client.notes,
                smsConsent: client.sms_consent_status === "opted_in",
              }} mode="details" />
              <DeleteClientButton clientId={client.id} clientName={`${client.first_name} ${client.last_name ?? ""}`.trim()} redirectTo="/clients" />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Advisor Card Vault</p>
              <h2 className="mt-1 text-2xl font-bold">Protected supplier payment cards</h2>
              <p className="mt-2 text-slate-600">Scout shows VGS aliases only. The real card remains inside VGS.</p>
            </div>
            <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">Sandbox</span>
          </div>
          <div className="mt-5 space-y-3">
            {paymentCredentials?.length ? paymentCredentials.map((credential) => {
              return <div key={credential.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold">{credential.display_label}</p>
                  <p className="mt-1 text-sm text-slate-600">{credential.brand ?? "Card"} ending {credential.last_four ?? "••••"} · {credential.expiration_month?.toString().padStart(2, "0")}/{credential.expiration_year?.toString().slice(-2)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Temporary security-code aliases automatically expire within one hour.</p>
                </div>
                <Link href={`/clients/${client.id}/payment-vault/${credential.id}`} className="rounded-lg bg-sky-700 px-4 py-2 text-center font-semibold text-white hover:bg-sky-600">Prepare supplier payment</Link>
              </div>;
            }) : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">No protected cards have been saved for this client yet.</div>}
          </div>
        </section>

        <div className="mt-6">
          <ClientIntakeManager clientId={client.id} initialActive={intakeIsActive} initialExpiresAt={intakeIsActive ? intakeLink?.expires_at ?? null : null} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Trips</h2>

                <p className="mt-1 text-slate-600">
                  Upcoming and previous travel bookings.
                </p>
              </div>

              <Link
                href={`/clients/${client.id}/add-trip`}
                className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400"
              >
                Add Trip
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {client.trips && client.trips.length > 0 ? (
                client.trips.map((trip) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="block rounded-xl border border-slate-200 bg-[#f6f8f7] p-5 transition hover:border-sky-500 hover:bg-white"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {trip.trip_name}
                        </h3>

                        <p className="mt-1 text-slate-600">
                          {trip.destination}
                        </p>

                        {trip.resort_hotel && (
                          <p className="mt-2 text-sm text-slate-700">
                            Resort: {trip.resort_hotel}
                          </p>
                        )}

                        {trip.supplier && (
                          <p className="mt-1 text-sm text-slate-600">
                            Supplier: {trip.supplier}
                          </p>
                        )}

                        {trip.booking_number && (
                          <p className="mt-1 text-sm text-slate-600">
                            Booking number: {trip.booking_number}
                          </p>
                        )}
                      </div>

                      <span className="w-fit rounded-full bg-sky-100 px-3 py-1 text-sm">
                        {trip.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Travel dates
                        </p>

                        <p className="mt-1 text-sm">
                          {trip.start_date} – {trip.end_date}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Travelers
                        </p>

                        <p className="mt-1 text-sm">
                          {trip.adults ?? 0} adults, {trip.children ?? 0} children
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Package price
                        </p>

                        <p className="mt-1 text-sm">
                          {trip.package_price != null
                            ? `$${Number(
                                trip.package_price
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "Not entered"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Commission
                        </p>

                        <p className="mt-1 text-sm">
                          {trip.commission_amount != null
                            ? `$${Number(
                                trip.commission_amount
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "Not entered"}
                        </p>
                      </div>
                    </div>

                    {trip.final_payment_date && (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm text-amber-800">
                          Final payment due: {trip.final_payment_date}
                        </p>
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <p className="text-lg font-semibold">No trips yet</p>

                  <p className="mt-2 text-slate-600">
                    Add this client&apos;s first vacation or reservation.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Client Details</h2>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-slate-500">Full name</p>

                <p className="mt-1 font-medium">
                  {client.first_name} {client.last_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Email</p>

                <p className="mt-1 break-words font-medium">
                  {client.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Mobile number</p>
                <p className="mt-1 font-medium">{client.phone_e164 ?? "Not added"}</p>
                <p className="mt-1 text-xs text-slate-500">Text permission: {client.sms_consent_status === "opted_in" ? "Granted" : client.sms_consent_status === "opted_out" ? "Withdrawn" : "Not recorded"}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Client since</p>

                <p className="mt-1 font-medium">{joinedDate}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold">Traveler Profile</h2>
          <p className="mt-1 text-slate-600">What the client has shared through their intake link. Sent via the Travel Profile Intake link above.</p>

          <div className="mt-6 space-y-4">
            {travelers && travelers.length > 0 ? travelers.map((traveler) => (
              <div key={traveler.id} className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{traveler.full_name}{traveler.needs_stroller && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Stroller</span>}</p>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{traveler.relationship ?? "traveler"}{traveler.date_of_birth ? ` · born ${traveler.date_of_birth}` : ""}</span>
                </div>
                {(traveler.passport_number || traveler.tsa_precheck_number || traveler.global_entry_number) && (
                  <p className="mt-2 text-sm text-slate-600">
                    {traveler.passport_number && `Passport ${traveler.passport_number} (${traveler.passport_country ?? "—"})`}
                    {traveler.tsa_precheck_number && ` · TSA PreCheck ${traveler.tsa_precheck_number}`}
                    {traveler.global_entry_number && ` · Global Entry ${traveler.global_entry_number}`}
                  </p>
                )}
                {traveler.dietary_restrictions && <p className="mt-1 text-sm text-slate-600">Dietary: {traveler.dietary_restrictions}</p>}
                {traveler.accessibility_needs && <p className="mt-1 text-sm text-slate-600">Accessibility: {traveler.accessibility_needs}</p>}
                {traveler.client_loyalty_programs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {traveler.client_loyalty_programs.map((program) => (
                      <li key={program.id}>{program.program_name} ({program.program_type}) — {program.member_number}</li>
                    ))}
                  </ul>
                )}
              </div>
            )) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No travelers shared yet.</p>}
          </div>

          {(client.travel_style || client.room_preferences || client.favorite_resorts?.length || client.favorite_cruise_lines?.length || client.favorite_airlines?.length) ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4 text-sm text-slate-600">
              {client.travel_style && <p><span className="font-semibold text-slate-700">Travel style:</span> {client.travel_style}</p>}
              {client.room_preferences && <p className="mt-1"><span className="font-semibold text-slate-700">Room preferences:</span> {client.room_preferences}</p>}
              {client.favorite_resorts && client.favorite_resorts.length > 0 && <p className="mt-1"><span className="font-semibold text-slate-700">Favorite resorts:</span> {client.favorite_resorts.join(", ")}</p>}
              {client.favorite_cruise_lines && client.favorite_cruise_lines.length > 0 && <p className="mt-1"><span className="font-semibold text-slate-700">Favorite cruise lines:</span> {client.favorite_cruise_lines.join(", ")}</p>}
              {client.favorite_airlines && client.favorite_airlines.length > 0 && <p className="mt-1"><span className="font-semibold text-slate-700">Airline preferences:</span> {client.favorite_airlines.join(", ")}</p>}
            </div>
          ) : null}

          {celebrations && celebrations.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Special occasions</p>
              {celebrations.map((celebration) => (
                <p key={celebration.id} className="text-sm text-slate-600"><span className="font-semibold text-slate-700">{celebration.occasion}</span>{celebration.occasion_date && ` — ${celebration.occasion_date}`}{celebration.recurring_annually ? " (every year)" : ""}</p>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#dceff0] text-[#0f6d78]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4M11 8v6M8 11h6" />
              </svg>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold">Scout Intelligence</h2>

              <p className="mt-1 text-slate-600">
                Important opportunities and upcoming deadlines for this client.
              </p>

              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold">No active alerts</p>

                <p className="mt-1 text-sm text-slate-600">
                  Scout will display booking windows, promotions, payment
                  deadlines, and travel document reminders here.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold">Notes</h2>

          <ClientProfileEditor client={{
            id: client.id,
            firstName: client.first_name,
            lastName: client.last_name ?? "",
            email: client.email ?? "",
            phone: client.phone_e164,
            notes: client.notes,
            smsConsent: client.sms_consent_status === "opted_in",
          }} mode="notes" />
        </section>
      </div>
    </main>
  );
}
