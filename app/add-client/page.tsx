"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientAction } from "../actions/bookings";

export default function AddClientPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const result = await createClientAction({ firstName, lastName, email, phone, smsConsent });

    if (!result.ok) {
      setMessage(result.error);
      setSaving(false);
      return;
    }

    router.push("/clients");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
      <h1 className="text-4xl font-bold">Add New Client</h1>

      <p className="mt-2 text-slate-600">
        Create a new travel client.
      </p>

      <form onSubmit={saveClient} className="mt-8 max-w-xl space-y-6">
        <div>
          <label className="mb-2 block">First Name</label>
          <input
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-lg bg-[#edf3f2] p-3"
            placeholder="John"
          />
        </div>

        <div>
          <label className="mb-2 block">Last Name</label>
          <input
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-lg bg-[#edf3f2] p-3"
            placeholder="Smith"
          />
        </div>

        <div>
          <label className="mb-2 block">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg bg-[#edf3f2] p-3"
            placeholder="john@email.com"
          />
        </div>

        <div>
          <label className="mb-2 block">Mobile number <span className="text-slate-500">(optional)</span></label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg bg-[#edf3f2] p-3"
            placeholder="(555) 123-4567"
          />
          <p className="mt-2 text-sm text-slate-500">Used only for client text messages you review and approve.</p>
          <label className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
            <input type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} disabled={!phone.trim()} className="mt-1" />
            <span>The client explicitly agreed to receive trip-related text messages. Consent is optional and can be withdrawn at any time.</span>
          </label>
        </div>

        {message && <p className="text-red-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Client"}
        </button>
      </form>
    </main>
  );
}
