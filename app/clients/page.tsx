export default function ClientsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <h1 className="text-4xl font-bold">Clients</h1>

      <p className="mt-2 text-slate-400">
        Manage all of your travel clients in one place.
      </p>

      <a
        href="/add-client"
        className="mt-6 inline-block rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white"
      >
        + Add Client
      </a>

      <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Smith Family</h2>
        <p className="mt-2 text-slate-400">
          Walt Disney World
        </p>
      </div>
    </main>
  );
}