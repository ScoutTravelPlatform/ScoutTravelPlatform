"use client";

import { useState } from "react";
import { createClientIntakeLinkAction, revokeClientIntakeLinkAction } from "@/app/actions/client-intake";

export default function ClientIntakeManager({ clientId, initialActive, initialExpiresAt }: { clientId: string; initialActive: boolean; initialExpiresAt: string | null }) {
  const [active, setActive] = useState(initialActive);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [intakePath, setIntakePath] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function generate() {
    setWorking(true); setMessage("");
    const result = await createClientIntakeLinkAction(clientId);
    setWorking(false);
    if (result.error || !result.path) return setMessage(result.error ?? "Scout could not create the link.");
    setIntakePath(result.path); setExpiresAt(result.expiresAt); setActive(true); setMessage("A new intake link is ready. Copy it now.");
  }
  async function copy() {
    if (!intakePath) return;
    const url = `${window.location.origin}${intakePath}`;
    await navigator.clipboard.writeText(url); setMessage("Intake link copied.");
  }
  async function revoke() {
    if (!window.confirm("Revoke this intake link? The client will no longer be able to open it.")) return;
    setWorking(true); const result = await revokeClientIntakeLinkAction(clientId); setWorking(false);
    if (result.error) return setMessage(result.error);
    setActive(false); setIntakePath(null); setExpiresAt(null); setMessage("Intake link revoked.");
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Client Experience</p><h2 className="mt-2 text-2xl font-bold">Travel Profile Intake</h2>
    <p className="mt-2 text-sm text-slate-600">Send a link so the client can fill in family members, travel documents, and preferences on their own time. Creating a new link replaces the old one.</p>
    <div className="mt-5 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{active ? "Intake link is active" : "Intake link is off"}</p>{active && expiresAt && <p className="mt-1 text-sm text-slate-600">Expires {formatDate(expiresAt)}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={generate} disabled={working} className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50">{working ? "Working..." : active ? "Create New Link" : "Create Intake Link"}</button>{active && <button type="button" onClick={revoke} disabled={working} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">Revoke</button>}</div></div>
      {intakePath && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={`${typeof window === "undefined" ? "" : window.location.origin}${intakePath}`} aria-label="Client intake link" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-3 text-sm" /><button type="button" onClick={copy} className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 font-semibold text-sky-800 hover:bg-sky-100">Copy Link</button></div>}
    </div>
    {message && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
  </section>;
}

function formatDate(value: string) { return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
