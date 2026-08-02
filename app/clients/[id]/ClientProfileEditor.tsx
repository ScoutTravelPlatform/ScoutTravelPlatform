"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientAction, updateClientNotesAction } from "@/app/actions/bookings";

type ClientProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  smsConsent: boolean;
};

export default function ClientProfileEditor({
  client,
  mode,
}: {
  client: ClientProfile;
  mode: "details" | "notes";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(mode === "notes");
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [smsConsent, setSmsConsent] = useState(client.smsConsent);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = mode === "notes"
      ? await updateClientNotesAction(client.id, notes)
      : await updateClientAction(client.id, {
          firstName,
          lastName,
          email,
          phone,
          smsConsent,
        });
    setPending(false);
    if (!result.ok) return setMessage(result.error);
    setMessage("Client details saved.");
    if (mode === "details") setEditing(false);
    router.refresh();
  }

  if (mode === "details" && !editing) {
    return <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:border-[#0f6d78] hover:text-[#0f6d78]">Edit client</button>;
  }

  return (
    <form onSubmit={save} className={mode === "details" ? "mt-6 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-2" : ""}>
      {mode === "details" ? (
        <>
          <Field label="First name"><input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClasses} required /></Field>
          <Field label="Last name"><input value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClasses} required /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClasses} required /></Field>
          <Field label="Mobile number"><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 123-4567" className={inputClasses} /></Field>
          <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-slate-200 bg-[#f7faf9] p-4 text-sm text-slate-600">
            <input type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} disabled={!phone.trim()} className="mt-1" />
            <span>The client explicitly agreed to receive trip-related text messages. Uncheck this immediately if consent is withdrawn.</span>
          </label>
        </>
      ) : (
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add preferences, celebration details, accessibility needs, or other client notes..." maxLength={5_000} className="mt-4 min-h-36 w-full rounded-xl border border-slate-300 bg-[#f7faf9] p-4 leading-7 outline-none focus:border-[#0f6d78]" />
      )}
      {message && <p role="status" className={`${mode === "details" ? "md:col-span-2 " : ""}text-sm font-semibold text-slate-600`}>{message}</p>}
      <div className={`${mode === "details" ? "md:col-span-2 " : "mt-4 "}flex gap-3`}>
        <button disabled={pending} className="rounded-lg bg-[#0f6d78] px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : mode === "details" ? "Save client" : "Save notes"}</button>
        {mode === "details" && <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-600">Cancel</button>}
      </div>
    </form>
  );
}

const inputClasses = "mt-2 w-full rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
