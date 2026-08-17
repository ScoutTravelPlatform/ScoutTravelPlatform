"use client";

import { useState } from "react";

type Card = {
  id: string;
  display_label: string;
  brand: string | null;
  last_four: string | null;
  expiration_month: number | null;
  expiration_year: number | null;
};

type Props = { token: string; cards: Card[]; defaultSupplier: string };

export default function AuthorizeExistingCardForm({ token, cards, defaultSupplier }: Props) {
  const [credentialId, setCredentialId] = useState(cards[0]?.id ?? "");
  const [supplier, setSupplier] = useState(defaultSupplier);
  const [purpose, setPurpose] = useState("Trip reservations and authorized supplier payments");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(credentialId) && consent && supplier.trim() && purpose.trim() && !saving;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setMessage("Saving authorization...");
    const amount = maximumAmount.trim() ? Number(maximumAmount) : null;
    const response = await fetch(`/api/portal/${token}/payment-authorizations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credentialId, supplier, purpose, maximumAmount: amount, consent }),
    });
    setSaving(false);
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(result?.error ?? "Scout could not save that authorization.");
      return;
    }
    setPurpose("Trip reservations and authorized supplier payments");
    setMaximumAmount("");
    setConsent(false);
    setMessage("Authorization saved. Your advisor has been notified.");
  }

  return <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 md:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-sky-800">Card on file</p>
    <h2 className="mt-2 text-2xl font-bold">Authorize a new payment</h2>
    <p className="mt-3 max-w-3xl leading-7 text-slate-700">Use a card you&apos;ve already given Scout for a new supplier, purpose, or amount — no need to enter the card again.</p>
    <form onSubmit={submit}>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Card</span>
          <select value={credentialId} onChange={(event) => setCredentialId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3">
            {cards.map((card) => <option key={card.id} value={card.id}>{card.display_label} — {card.brand ?? "Card"} ending {card.last_four ?? "••••"}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Approved supplier</span><input value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={150} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold">Authorized purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={500} rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Maximum authorized amount (optional)</span><input type="number" min="0.01" step="0.01" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-white p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span className="text-sm leading-6">I authorize my travel advisor to use this card only for the supplier, purpose, and maximum amount stated above for this trip.</span></label>
      <button type="submit" disabled={!canSubmit} className="mt-5 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save authorization"}</button>
      {message && <p role="status" className="mt-4 font-semibold text-slate-700">{message}</p>}
    </form>
  </section>;
}
