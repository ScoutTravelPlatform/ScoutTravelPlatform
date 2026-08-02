"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelCommunicationAction,
  saveCommunicationAction,
  sendCommunicationAction,
} from "@/app/actions/communications";
import {
  buildCommunicationTemplate,
  type CommunicationMessageType,
} from "@/lib/communication-templates";
import type { Tables } from "@/lib/supabase/database.types";

type TripOption = {
  id: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  finalPaymentDate: string | null;
  clientId: string;
  clientFirstName: string;
  clientName: string;
  email: string;
  phone: string | null;
  smsConsent: boolean;
  nextPayment: { name: string; amount: number; dueDate: string | null } | null;
};
type Message = Tables<"communication_drafts"> & {
  clientName: string;
  tripName: string;
};

const messageTypes: Array<{ value: CommunicationMessageType; label: string }> = [
  { value: "general", label: "General update" },
  { value: "payment_reminder", label: "Payment reminder" },
  { value: "trip_reminder", label: "Upcoming trip" },
  { value: "document_reminder", label: "Travel documents" },
  { value: "welcome_home", label: "Welcome home" },
];

export default function CommunicationWorkspace({
  trips,
  initialMessages,
  providers,
  aiConfigured,
}: {
  trips: TripOption[];
  initialMessages: Message[];
  providers: { email: boolean; sms: boolean };
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [messageType, setMessageType] = useState<CommunicationMessageType>("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === tripId) ?? null,
    [tripId, trips],
  );

  function useTemplate() {
    if (!selectedTrip) return;
    const template = buildCommunicationTemplate({
      channel,
      messageType,
      clientFirstName: selectedTrip.clientFirstName,
      tripName: selectedTrip.tripName,
      destination: selectedTrip.destination,
      startDate: selectedTrip.startDate,
      endDate: selectedTrip.endDate,
      finalPaymentDate: selectedTrip.finalPaymentDate,
      nextPayment: selectedTrip.nextPayment,
    });
    setSubject(template.subject);
    setBody(template.body);
    setMessage("A professional starting draft is ready. Review and personalize it before saving.");
  }

  async function generateWithAi() {
    if (!selectedTrip || !aiConfigured) return;
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch("/api/communications/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId, channel, messageType, advisorNotes }),
      });
      const result = await response.json().catch(() => null) as {
        draft?: { subject: string; body: string };
        error?: string;
      } | null;
      if (!response.ok || !result?.draft) {
        setMessage(result?.error ?? "Scout could not create an AI draft. Try again.");
        return;
      }
      setSubject(result.draft.subject);
      setBody(result.draft.body);
      setMessage("Scout AI prepared a draft. Review and edit every detail before saving or sending.");
    } catch {
      setMessage("Scout could not reach the AI draft assistant. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await saveCommunicationAction({
      tripId,
      channel,
      messageType,
      subject: channel === "email" ? subject : null,
      body,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    });
    setPending(false);
    if (result.error || !result.data) {
      setMessage(result.error ?? "Scout could not save this message.");
      return;
    }
    const trip = trips.find((item) => item.id === result.data.trip_id);
    setMessages((current) => [{
      ...result.data,
      clientName: trip?.clientName ?? "Client",
      tripName: trip?.tripName ?? "Trip",
    }, ...current]);
    setSubject("");
    setBody("");
    setScheduledFor("");
    setMessage(result.data.status === "scheduled" ? "Message scheduled." : "Draft saved.");
    router.refresh();
  }

  async function sendNow(item: Message) {
    setMessage("");
    const result = await sendCommunicationAction(item.id);
    if (result.error || !result.data) {
      setMessage(result.error ?? "Scout could not send that message.");
      router.refresh();
      return;
    }
    setMessages((current) => current.map((existing) => (
      existing.id === item.id ? { ...existing, ...result.data } : existing
    )));
    setMessage(`${item.channel === "email" ? "Email" : "Text message"} sent.`);
    router.refresh();
  }

  async function cancel(item: Message) {
    setMessage("");
    const result = await cancelCommunicationAction(item.id);
    if (result.error) return setMessage(result.error);
    setMessages((current) => current.map((existing) => (
      existing.id === item.id ? { ...existing, status: "canceled", scheduled_for: null } : existing
    )));
    setMessage("Message canceled.");
    router.refresh();
  }

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StatusCard label="Email delivery" ready={providers.email} readyText="Connected" waitingText="Needs Resend settings" />
        <StatusCard label="Text delivery" ready={providers.sms} readyText="Connected" waitingText="Needs Twilio settings" />
        <StatusCard label="AI draft assistant" ready={aiConfigured} readyText="Connected" waitingText="Needs private OpenAI key" />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#243c57]">Prepare a client message</h2>
            <p className="mt-1 text-sm text-slate-500">Scout always leaves final review and sending in the advisor’s hands.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={generateWithAi} disabled={!selectedTrip || !aiConfigured || generating} className="rounded-xl bg-[#0f6d78] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{generating ? "Drafting…" : "Draft with Scout AI"}</button>
            <button type="button" onClick={useTemplate} disabled={!selectedTrip} className="rounded-xl border border-[#0f6d78] bg-[#edf7f7] px-5 py-3 text-sm font-bold text-[#0f6d78] disabled:opacity-50">Use standard template</button>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Trip and client">
            <select value={tripId} onChange={(event) => setTripId(event.target.value)} className={inputClasses} required>
              {trips.length ? trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.clientName} — {trip.tripName}</option>) : <option value="">Add a trip first</option>}
            </select>
          </Field>
          <Field label="Message purpose">
            <select value={messageType} onChange={(event) => setMessageType(event.target.value as CommunicationMessageType)} className={inputClasses}>
              {messageTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Delivery method">
            <select value={channel} onChange={(event) => {
              const nextChannel = event.target.value as "email" | "sms";
              setChannel(nextChannel);
              if (nextChannel === "sms") setSubject("");
            }} className={inputClasses}>
              <option value="email">Email{selectedTrip ? ` · ${selectedTrip.email}` : ""}</option>
              <option value="sms">Text message{selectedTrip?.phone ? selectedTrip.smsConsent ? ` · ${selectedTrip.phone}` : " · consent not recorded" : " · add client mobile number"}</option>
            </select>
          </Field>
          <Field label="Schedule (optional)">
            <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className={inputClasses} />
          </Field>
          <label className="md:col-span-2"><span className="text-sm font-semibold text-slate-700">What should Scout AI include? <span className="font-normal text-slate-500">(optional)</span></span><textarea value={advisorNotes} onChange={(event) => setAdvisorNotes(event.target.value)} maxLength={1_500} rows={3} placeholder="Example: Keep it warm and mention that the family is celebrating a birthday." className={`${inputClasses} resize-y`} /><span className="mt-2 block text-xs text-slate-500">Do not enter card numbers, security codes, passwords, or vault information.</span></label>
          {channel === "email" && <label className="md:col-span-2"><span className="text-sm font-semibold text-slate-700">Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} className={inputClasses} required /></label>}
          <label className="md:col-span-2"><span className="text-sm font-semibold text-slate-700">Message</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10_000} rows={10} className={`${inputClasses} resize-y leading-7`} required /></label>
          <div className="md:col-span-2 flex justify-end">
            <button disabled={pending || !trips.length} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white hover:bg-[#0c5963] disabled:opacity-50">{pending ? "Saving…" : scheduledFor ? "Review and schedule" : "Save draft"}</button>
          </div>
        </form>
      </section>

      {message && <p role="status" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-slate-700">{message}</p>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-[#243c57]">Message queue</h2>
          <p className="mt-1 text-sm text-slate-500">Drafts, scheduled reminders, and delivery history for your organization.</p>
        </div>
        {messages.length ? <div className="divide-y divide-slate-100">{messages.map((item) => (
          <article key={item.id} className="grid gap-5 px-6 py-5 xl:grid-cols-[1.1fr_1.5fr_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#edf7f7] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0f6d78]">{item.channel}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusClasses(item.status)}`}>{item.status}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[#243c57]">{item.subject || messageTypes.find((type) => type.value === item.message_type)?.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.clientName} · {item.tripName}</p>
              {item.scheduled_for && <p className="mt-1 text-xs font-semibold text-slate-500">Scheduled {new Date(item.scheduled_for).toLocaleString()}</p>}
            </div>
            <p className="line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {["draft", "scheduled", "failed"].includes(item.status) && <button type="button" onClick={() => sendNow(item)} className="rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-bold text-white">Send now</button>}
              {["draft", "scheduled", "failed"].includes(item.status) && <button type="button" onClick={() => cancel(item)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>}
            </div>
          </article>
        ))}</div> : <div className="p-12 text-center"><p className="font-semibold text-[#243c57]">No messages yet</p><p className="mt-2 text-sm text-slate-500">Prepare the first client message above.</p></div>}
      </section>
    </>
  );
}

const inputClasses = "mt-2 w-full rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }
function StatusCard({ label, ready, readyText, waitingText }: { label: string; ready: boolean; readyText: string; waitingText: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 font-bold ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? readyText : waitingText}</p></div>;
}
function statusClasses(status: Message["status"]) {
  if (status === "sent") return "bg-emerald-100 text-emerald-800";
  if (status === "failed") return "bg-rose-100 text-rose-800";
  if (status === "scheduled") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-600";
}
