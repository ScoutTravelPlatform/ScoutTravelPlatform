"use client";

import { useState } from "react";

export default function CheckoutSessionLauncher({ clientId, credentialId }: { clientId: string; credentialId: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createSession() {
    setLoading(true);
    setMessage("Creating an isolated Sandbox checkout…");
    const response = await fetch("/api/secure-checkout/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, credentialId }),
    });
    const result = await response.json().catch(() => null) as { error?: string; url?: string } | null;
    if (!response.ok || !result?.url) {
      setLoading(false);
      setMessage(result?.error ?? "Scout could not create the secure checkout.");
      return;
    }
    window.location.assign(result.url);
  }

  return <section className="mt-6 rounded-2xl border border-sky-300 bg-sky-50 p-6">
    <p className="text-sm font-bold uppercase tracking-widest text-sky-800">Browser-independent checkout</p>
    <h2 className="mt-2 text-xl font-bold">Start an isolated checkout session</h2>
    <p className="mt-2 leading-7 text-slate-700">This creates an audited session without sending card aliases to your browser. The hosted operator-browser connection is the next integration step.</p>
    <button type="button" onClick={createSession} disabled={loading} className="mt-4 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating…" : "Create Sandbox session"}</button>
    {message && <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
  </section>;
}
