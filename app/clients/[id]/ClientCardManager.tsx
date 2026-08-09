"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addClientPaymentCredentialAction, revokeClientPaymentCredentialAction } from "@/app/actions/payment-credentials";

type Credential = {
  id: string; display_label: string; brand: string | null; last_four: string | null;
  expiration_month: number | null; expiration_year: number | null;
};
type Trip = { id: string; trip_name: string };

const emptyForm = {
  cardNumber: "", expiration: "", cvc: "", label: "Primary booking card",
  tripId: "", supplier: "", purpose: "Trip reservations and authorized supplier payments", maximumAmount: "",
};

export default function ClientCardManager({ clientId, trips, initialCredentials }: { clientId: string; trips: Trip[]; initialCredentials: Credential[] }) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, tripId: trips[0]?.id ?? "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const expirationMatch = form.expiration.match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
  const cardDigits = form.cardNumber.replace(/\D/g, "");
  const canSubmit = cardDigits.length >= 13 && cardDigits.length <= 19 &&
    /^\d{3,4}$/.test(form.cvc) && Boolean(expirationMatch) &&
    form.tripId && form.label.trim() && form.supplier.trim() && form.purpose.trim() && !saving;

  function openAdd() { setForm({ ...emptyForm, tripId: trips[0]?.id ?? "" }); setFormOpen(true); setMessage(""); }
  function closeForm() { setFormOpen(false); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !expirationMatch) return;
    setSaving(true);
    setMessage("");
    const result = await addClientPaymentCredentialAction({
      clientId,
      tripId: form.tripId,
      cardNumber: cardDigits,
      cvc: form.cvc,
      expirationMonth: Number(expirationMatch[1]),
      expirationYear: Number(expirationMatch[2].length === 2 ? `20${expirationMatch[2]}` : expirationMatch[2]),
      label: form.label,
      supplier: form.supplier,
      purpose: form.purpose,
      maximumAmount: form.maximumAmount.trim() ? Number(form.maximumAmount) : null,
    });
    setSaving(false);
    if (!result.ok) return setMessage(result.error ?? "Scout could not save that card.");
    setFormOpen(false);
    setMessage("Card saved.");
    router.refresh();
  }

  async function remove(credentialId: string) {
    if (!window.confirm("Remove this card? The advisor will no longer be able to use it.")) return;
    const result = await revokeClientPaymentCredentialAction(credentialId, clientId);
    if (!result.ok) return setMessage(result.error ?? "Scout could not remove that card.");
    setCredentials((current) => current.filter((c) => c.id !== credentialId));
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Advisor Card Vault</p>
          <h2 className="mt-1 text-2xl font-bold">Protected supplier payment cards</h2>
          <p className="mt-2 text-slate-600">Scout encrypts the card and only decrypts it here, for you.</p>
        </div>
        <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">Sandbox</span>
      </div>

      <div className="mt-5 space-y-3">
        {credentials.length ? credentials.map((credential) => (
          <div key={credential.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">{credential.display_label}</p>
              <p className="mt-1 text-sm text-slate-600">{credential.brand ?? "Card"} ending {credential.last_four ?? "••••"} · {credential.expiration_month?.toString().padStart(2, "0")}/{credential.expiration_year?.toString().slice(-2)}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/clients/${clientId}/payment-vault/${credential.id}`} className="rounded-lg bg-sky-700 px-4 py-2 text-center font-semibold text-white hover:bg-sky-600">Prepare supplier payment</Link>
              <button type="button" onClick={() => remove(credential.id)} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">Delete</button>
            </div>
          </div>
        )) : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">No protected cards have been saved for this client yet.</div>}
      </div>

      {!formOpen && (
        <button type="button" onClick={openAdd} disabled={!trips.length} className="mt-4 rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {trips.length ? "Add Card" : "Add a trip before adding a card"}
        </button>
      )}

      {formOpen && (
        <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4 md:grid-cols-2">
          <p className="text-sm font-semibold text-[#243c57] md:col-span-2">Add a protected card</p>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Card number</span><input value={form.cardNumber} onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))} placeholder="4111 1111 1111 1111" inputMode="numeric" maxLength={23} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Expiration</span><input value={form.expiration} onChange={(e) => setForm((f) => ({ ...f, expiration: e.target.value }))} placeholder="MM/YY" inputMode="numeric" maxLength={7} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Security code</span><input value={form.cvc} onChange={(e) => setForm((f) => ({ ...f, cvc: e.target.value }))} placeholder="CVV" inputMode="numeric" maxLength={4} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Card label</span><input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} maxLength={100} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Trip</span>
            <select value={form.tripId} onChange={(e) => setForm((f) => ({ ...f, tripId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white p-3">
              {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.trip_name}</option>)}
            </select>
          </label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Approved supplier</span><input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} maxLength={150} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold">Authorized purpose</span><textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} maxLength={500} rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Maximum authorized amount (optional)</span><input type="number" min="0.01" step="0.01" value={form.maximumAmount} onChange={(e) => setForm((f) => ({ ...f, maximumAmount: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
          {message && <p role="status" className="md:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button disabled={!canSubmit} className="rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save card"}</button>
          </div>
        </form>
      )}
      {!formOpen && message && <p role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</p>}
    </section>
  );
}
