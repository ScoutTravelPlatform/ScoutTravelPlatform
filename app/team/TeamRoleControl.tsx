"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTeamRoleAction } from "@/app/actions/team";

const roles = ["owner", "admin", "advisor", "assistant", "finance", "read_only"] as const;

export default function TeamRoleControl({ membershipId, initialRole, canManage }: { membershipId: string; initialRole: typeof roles[number]; canManage: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function updateRole(nextRole: typeof roles[number]) {
    const previous = role;
    setRole(nextRole); setSaving(true); setMessage("");
    const result = await updateTeamRoleAction({ membershipId, role: nextRole });
    setSaving(false);
    if (result.error) { setRole(previous); setMessage(result.error); return; }
    setMessage("Role updated."); router.refresh();
  }

  if (!canManage) return <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase text-slate-700">{role.replace("_", " ")}</span>;
  return <div className="min-w-48">
    <select aria-label="Team role" value={role} disabled={saving} onChange={(event) => updateRole(event.target.value as typeof roles[number])} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60">
      {roles.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
    </select>
    {message && <p role="status" className="mt-2 max-w-64 text-xs text-slate-600">{message}</p>}
  </div>;
}
