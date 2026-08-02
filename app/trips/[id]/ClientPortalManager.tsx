"use client";

import { useState } from "react";
import { createClientPortalLinkAction, revokeClientPortalLinkAction } from "../../actions/client-portal";

export default function ClientPortalManager({ tripId, initialActive, initialExpiresAt }: { tripId: string; initialActive: boolean; initialExpiresAt: string | null }) {
  const [active, setActive] = useState(initialActive);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [portalPath, setPortalPath] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function generate() {
    setWorking(true); setMessage("");
    const result = await createClientPortalLinkAction(tripId);
    setWorking(false);
    if (result.error || !result.path) return setMessage(result.error ?? "Scout could not create the link.");
    setPortalPath(result.path); setExpiresAt(result.expiresAt); setActive(true); setMessage("A new client portal link is ready. Copy it now.");
  }
  async function copy() {
    if (!portalPath) return;
    const url = `${window.location.origin}${portalPath}`;
    await navigator.clipboard.writeText(url); setMessage("Client portal link copied.");
  }
  async function revoke() {
    if (!window.confirm("Revoke this client portal link? The client will no longer be able to open it.")) return;
    setWorking(true); const result = await revokeClientPortalLinkAction(tripId); setWorking(false);
    if (result.error) return setMessage(result.error);
    setActive(false); setPortalPath(null); setExpiresAt(null); setMessage("Client portal access revoked.");
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Client Experience</p><h2 className="mt-2 text-2xl font-bold">Client Portal</h2>
    <p className="mt-2 text-sm text-slate-600">Share a private link to the daily itinerary and client-visible trip dates. Creating a new link replaces the old one.</p>
    <div className="mt-5 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{active ? "Portal access is active" : "Portal access is off"}</p>{active && expiresAt && <p className="mt-1 text-sm text-slate-600">Expires {formatDate(expiresAt)}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={generate} disabled={working} className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50">{working ? "Working..." : active ? "Create New Link" : "Create Portal Link"}</button>{active && <button type="button" onClick={revoke} disabled={working} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">Revoke</button>}</div></div>
      {portalPath && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={`${typeof window === "undefined" ? "" : window.location.origin}${portalPath}`} aria-label="Client portal link" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-3 text-sm" /><button type="button" onClick={copy} className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 font-semibold text-sky-800 hover:bg-sky-100">Copy Link</button></div>}
    </div>
    {message && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
  </section>;
}

function formatDate(value: string) { return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
