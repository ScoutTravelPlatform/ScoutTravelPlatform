export default function AddClientPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <h1 className="text-4xl font-bold">Add New Client</h1>

      <p className="mt-2 text-slate-400">
        Let's create your first travel client.
      </p>

      <div className="mt-8 max-w-xl space-y-6">

        <div>
          <label className="block mb-2">First Name</label>
          <input
            className="w-full rounded-lg bg-slate-800 p-3"
            placeholder="John"
          />
        </div>

        <div>
          <label className="block mb-2">Last Name</label>
          <input
            className="w-full rounded-lg bg-slate-800 p-3"
            placeholder="Smith"
          />
        </div>

        <div>
          <label className="block mb-2">Email</label>
          <input
            className="w-full rounded-lg bg-slate-800 p-3"
            placeholder="john@email.com"
          />
        </div>

        <a
  href="/clients"
  className="inline-block rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white hover:bg-sky-400"
>
  Save Client
</a>

      </div>
    </main>
  );
}