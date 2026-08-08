"use client";

import { useState } from "react";

type Props = { token: string; defaultSupplier: string };

function detectBrand(cardNumber: string): string {
  if (/^4/.test(cardNumber)) return "Visa";
  if (/^5[1-5]/.test(cardNumber)) return "Mastercard";
  if (/^3[47]/.test(cardNumber)) return "Amex";
  if (/^6(?:011|5)/.test(cardNumber)) return "Discover";
  return "Card";
}

export default function SandboxPaymentCardForm({ token, defaultSupplier }: Props) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvc, setCvc] = useState("");
  const [supplier, setSupplier] = useState(defaultSupplier);
  const [purpose, setPurpose] = useState("Trip reservations and authorized supplier payments");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [label, setLabel] = useState("Primary booking card");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const cardDigits = cardNumber.replace(/\D/g, "");
  const expirationMatch = expiration.match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
  const cardValid = cardDigits.length >= 13 && cardDigits.length <= 19;
  const cvcValid = /^\d{3,4}$/.test(cvc);
  const canSubmit = cardValid && Boolean(expirationMatch) && cvcValid && consent &&
    supplier.trim() && purpose.trim() && label.trim() && !saving;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !expirationMatch) return;
    setSaving(true);
    setMessage("Saving protected card...");
    const amount = maximumAmount.trim() ? Number(maximumAmount) : null;
    const response = await fetch(`/api/portal/${token}/payment-credentials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cardNumber: cardDigits,
        cvc,
        expirationMonth: Number(expirationMatch[1]),
        expirationYear: Number(expirationMatch[2].length === 2 ? `20${expirationMatch[2]}` : expirationMatch[2]),
        brand: detectBrand(cardDigits),
        lastFour: cardDigits.slice(-4),
        label,
        supplier,
        purpose,
        maximumAmount: amount,
        consent,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(result?.error ?? "Scout could not save the protected card.");
      return;
    }
    setCardNumber(""); setExpiration(""); setCvc("");
    setMessage(`Test card ending ${cardDigits.slice(-4)} was saved persistently and securely for this trip.`);
  }

  return <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 md:p-8">
    <p className="text-sm font-bold uppercase tracking-widest text-amber-800">Sandbox Test Only</p>
    <h2 className="mt-2 text-2xl font-bold">Add a protected booking card</h2>
    <p className="mt-3 max-w-3xl leading-7 text-slate-700">Use a test card only. Scout encrypts the card before storing it and only your advisor can view it when booking. Do not enter a real card yet.</p>
    <form onSubmit={submit}>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Card number</span><input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="4111 1111 1111 1111" inputMode="numeric" maxLength={23} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Expiration</span><input value={expiration} onChange={(event) => setExpiration(event.target.value)} placeholder="MM/YY" inputMode="numeric" maxLength={7} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Security code</span><input value={cvc} onChange={(event) => setCvc(event.target.value)} placeholder="CVV" inputMode="numeric" maxLength={4} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Card label</span><input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Approved supplier</span><input value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={150} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold">Authorized purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={500} rows={2} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Maximum authorized amount (optional)</span><input type="number" min="0.01" step="0.01" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span className="text-sm leading-6">I authorize my travel advisor to use this protected card only for the supplier, purpose, and maximum amount stated above for this trip.</span></label>
      <button type="submit" disabled={!canSubmit} className="mt-5 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : "Save protected test card"}</button>
      {message && <p role="status" className="mt-4 font-semibold text-slate-700">{message}</p>}
    </form>
  </section>;
}
