"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClientAction } from "@/app/actions/bookings";

export default function DeleteClientButton({ clientId, clientName, redirectTo }: { clientId: string; clientName: string; redirectTo?: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Permanently delete ${clientName}? This also deletes every trip, quote, task, payment, and message linked to this client. This cannot be undone.`)) return;
    setWorking(true);
    setError("");
    const result = await deleteClientAction(clientId);
    setWorking(false);
    if (!result.ok) return setError(result.error);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={remove} disabled={working} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
        {working ? "Deleting…" : "Delete"}
      </button>
      {error && <p role="status" className="max-w-48 text-right text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
