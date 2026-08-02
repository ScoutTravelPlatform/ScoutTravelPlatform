"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTripAction } from "@/app/actions/bookings";

export default function DeleteTripButton({ tripId, tripName, redirectTo }: { tripId: string; tripName: string; redirectTo?: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Permanently delete "${tripName}"? This also deletes every quote, task, payment, commission, and itinerary item linked to this trip. This cannot be undone.`)) return;
    setWorking(true);
    setError("");
    const result = await deleteTripAction(tripId);
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
