const priorities = [
  {
    title: "Payments Due",
    count: 3,
    description: "Client payments due within 7 days",
    status: "Needs attention",
  },
  {
    title: "Reservations",
    count: 2,
    description: "Reservations missing confirmation details",
    status: "Review",
  },
  {
    title: "Quote Requests",
    count: 4,
    description: "New requests waiting for a response",
    status: "New",
  },
  {
    title: "Promotion Opportunities",
    count: 5,
    description: "Trips that may qualify for a better offer",
    status: "Opportunity",
  },
];

const trips = [
  {
    client: "Smith Family",
    destination: "Walt Disney World",
    dates: "August 12–18, 2026",
    status: "Final payment due",
  },
  {
    client: "Johnson Family",
    destination: "Royal Caribbean Cruise",
    dates: "September 5–12, 2026",
    status: "Dining opens soon",
  },
  {
    client: "Taylor Family",
    destination: "Universal Orlando",
    dates: "October 3–7, 2026",
    status: "Confirmed",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-400">
              Scout Travel
            </p>
<div className="mb-8 flex gap-4">
  <a
    href="/"
    className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white"
  >
    Dashboard
  </a>

  <a
    href="/clients"
    className="rounded-lg border border-slate-700 px-4 py-2"
  >
    Clients
  </a>
</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Good afternoon, Alex
            </h1>

            <p className="mt-2 text-slate-400">
              Here is what needs your attention today.
            </p>
          </div>

         <a
  href="/add-client"
  className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white hover:bg-sky-400"
>
  Add New Client
</a>
        </header>

        <section className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Today&apos;s Priorities</h2>
              <p className="mt-1 text-sm text-slate-400">
                Scout organized your most important actions.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {priorities.map((priority) => (
              <div
                key={priority.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/10"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-200">
                    {priority.title}
                  </h3>

                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                    {priority.status}
                  </span>
                </div>

                <p className="mt-5 text-4xl font-bold">{priority.count}</p>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {priority.description}
                </p>

                <button className="mt-5 text-sm font-semibold text-sky-400 hover:text-sky-300">
                  View details →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 pb-10 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 lg:col-span-2">
            <div className="border-b border-slate-800 px-6 py-5">
              <h2 className="text-xl font-semibold">Upcoming Trips</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your next client departures and important trip milestones.
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {trips.map((trip) => (
                <div
                  key={trip.client}
                  className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">{trip.client}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {trip.destination}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{trip.dates}</p>
                  </div>

                  <span className="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                    {trip.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              Scout Intelligence
            </p>

            <h2 className="mt-3 text-xl font-semibold">
              One opportunity found
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              The Smith Family&apos;s Disney reservation may qualify for a new
              promotion. Reviewing it could save the client money.
            </p>

            <button className="mt-6 w-full rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 font-semibold text-sky-300 hover:bg-sky-500/20">
              Review Opportunity
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}