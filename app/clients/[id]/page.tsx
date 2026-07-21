export default function ClientProfilePage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <a
        href="/clients"
        className="text-sm font-semibold text-sky-400 hover:text-sky-300"
      >
        ← Back to Clients
      </a>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Client Profile
        </p>

        <h1 className="mt-2 text-4xl font-bold">Smith Family</h1>

        <p className="mt-2 text-slate-400">
          Walt Disney World · August 12–18, 2026
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Travelers</h2>

            <div className="mt-4 space-y-3 text-slate-300">
              <p>John Smith</p>
              <p>Jane Smith</p>
              <p>Emma Smith, age 8</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Payments</h2>

            <div className="mt-4 space-y-3">
              <p className="text-green-400">✓ Deposit paid</p>
              <p className="text-amber-400">Final payment due July 30</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Tasks</h2>

            <div className="mt-4 space-y-3 text-slate-300">
              <p>☐ Book dining reservations</p>
              <p>☐ Purchase Memory Maker</p>
              <p>☐ Send final travel documents</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Timeline</h2>

            <div className="mt-4 space-y-4 text-slate-300">
              <p>✓ Quote sent</p>
              <p>✓ Deposit paid</p>
              <p>✓ Reservation confirmed</p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Scout Intelligence
          </p>

          <h2 className="mt-3 text-xl font-semibold">
            Two items need attention
          </h2>

          <div className="mt-5 space-y-4 text-slate-300">
            <p>Dining reservations open tomorrow.</p>
            <p>This trip may qualify for a new Disney promotion.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}