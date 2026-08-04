import Link from "next/link";
import { createAuthorizedClient } from "../../lib/auth";
import { isEmailDeliveryConfigured } from "../../lib/email";
import DeleteClientButton from "./DeleteClientButton";
import InviteClientForm from "./InviteClientForm";

export default async function ClientsPage() {
  const supabase = await createAuthorizedClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Clients</h1>
          <p className="mt-2 text-slate-600">
            View and manage your travel clients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <InviteClientForm emailDeliveryConfigured={isEmailDeliveryConfigured()} />
          <Link
            href="/add-client"
            className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white"
          >
            Add Client
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-8 text-red-400">
          Error loading clients: {error.message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {!clients || clients.length === 0 ? (
          <p className="text-slate-600">No clients found.</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500"
            >
              <Link href={`/clients/${client.id}`} className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">
                  {client.first_name} {client.last_name}
                </h2>

                <p className="text-slate-600">{client.email}</p>
              </Link>
              <DeleteClientButton clientId={client.id} clientName={`${client.first_name} ${client.last_name}`} />
            </div>
          ))
        )}
      </div>
    </main>
  );
}
