"use client";

import { useState } from "react";
import { assignTripAdvisorAction } from "@/app/actions/bookings";

type TeamMember = { userId: string; name: string; role: string };

export default function AdvisorAssignment({
  tripId,
  initialAdvisorId,
  team,
  canManage,
}: {
  tripId: string;
  initialAdvisorId: string | null;
  team: TeamMember[];
  canManage: boolean;
}) {
  const [advisorId, setAdvisorId] = useState(initialAdvisorId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function change(nextAdvisorId: string) {
    const previous = advisorId;
    setAdvisorId(nextAdvisorId);
    setSaving(true);
    setMessage("");
    const result = await assignTripAdvisorAction(tripId, nextAdvisorId || null);
    setSaving(false);
    if (!result.ok) {
      setAdvisorId(previous);
      setMessage(result.error);
      return;
    }
    setMessage("Assignment saved.");
  }

  const selected = team.find((member) => member.userId === advisorId);
  if (!canManage) {
    return <div className="text-left lg:text-right"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned advisor</p><p className="mt-1 font-semibold text-[#243c57]">{selected?.name ?? "Unassigned"}</p></div>;
  }

  return <div className="w-full min-w-56 text-left lg:text-right">
    <label htmlFor={`trip-advisor-${tripId}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned advisor</label>
    <select
      id={`trip-advisor-${tripId}`}
      value={advisorId}
      disabled={saving}
      onChange={(event) => change(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f6d78] disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {team.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
    </select>
    {message && <p role="status" className={`mt-1 text-xs ${message === "Assignment saved." ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>}
  </div>;
}
