"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientInviteLinkAction } from "@/app/actions/client-intake";

export default function InviteClientForm({ emailDeliveryConfigured }: { emailDeliveryConfigured: boolean }) {
  const linkInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setLink("");
    const result = await createClientInviteLinkAction({ contact });
    setPending(false);
    if (result.error) return setMessage(result.error);
    setContact("");
    setLink(`${window.location.origin}${result.path}`);
    const isEmail = contact.includes("@");
    if (!isEmail) {
      setMessage("Invite created. Copy the link below and text it to your client yourself.");
    } else if (result.emailStatus === "sent") {
      setMessage("Invitation email sent. The link is also available below.");
    } else if (result.emailStatus === "failed") {
      setMessage("The invite was created, but email delivery failed. Copy and send the link below.");
    } else {
      setMessage("Invite created. Email delivery is not configured yet, so copy and send the link below.");
    }
    router.refresh();
  }

  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
      setMessage("Invite link copied.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      const copied = document.execCommand("copy");
      setMessage(copied ? "Invite link copied." : "Your browser blocked automatic copying. The full link is selected—press Command+C (Mac) or Ctrl+C (Windows).");
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-sky-300 bg-white px-5 py-3 font-semibold text-sky-800 hover:bg-sky-50">
        Invite Client
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-semibold text-slate-700">Invite a prospective client</p>
      <p className="mt-1 text-xs text-slate-600">Type their email or phone number. Scout will create a link for them to share their own travel profile — no client record is created until they respond.</p>
      <form onSubmit={create} className="mt-3 flex gap-2">
        <input
          aria-label="Client email or phone number"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="client@example.com or (555) 555-1234"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-3 text-sm"
        />
        <button disabled={pending} className="rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
      {!emailDeliveryConfigured && (
        <p className="mt-2 text-xs text-amber-800">Email delivery is not connected yet — email invites will need to be copied and sent manually.</p>
      )}
      {message && <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
      {link && (
        <div className="mt-2 flex gap-2">
          <input ref={linkInput} aria-label="Invite link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-sky-300 bg-white p-2 text-xs" />
          <button type="button" onClick={copyLink} className="rounded-lg border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-800">Copy</button>
        </div>
      )}
      <button type="button" onClick={() => setOpen(false)} className="mt-3 text-xs font-semibold text-slate-500 hover:underline">Close</button>
    </div>
  );
}
