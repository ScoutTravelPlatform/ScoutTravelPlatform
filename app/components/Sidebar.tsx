export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-bold text-sky-400">
        Scout Travel
      </h1>

      <nav className="mt-8 space-y-3">
        <a href="/" className="block rounded-lg p-3 hover:bg-slate-800">
          🏠 Dashboard
        </a>

        <a href="/clients" className="block rounded-lg p-3 hover:bg-slate-800">
          👥 Clients
        </a>

        <a href="#" className="block rounded-lg p-3 hover:bg-slate-800">
          ✈️ Trips
        </a>

        <a href="#" className="block rounded-lg p-3 hover:bg-slate-800">
          💬 Quotes
        </a>

        <a href="#" className="block rounded-lg p-3 hover:bg-slate-800">
          ✅ Tasks
        </a>
      </nav>
    </div>
  );
}