"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addItineraryItemAction, deleteItineraryItemAction } from "../../actions/trip-workspace";
import type { Tables } from "@/lib/supabase/database.types";

const CATEGORIES = ["Park", "Dining", "Activity", "Travel", "Resort", "Other"] as const;

export default function DailyItineraryPlanner({ tripId, startDate, initialItems }: { tripId: string; startDate: string; initialItems: Tables<"itinerary_items">[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [itemDate, setItemDate] = useState(startDate);
  const [startTime, setStartTime] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Park");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const days = useMemo(() => Object.entries(items.reduce<Record<string, Tables<"itinerary_items">[]>>((groups, item) => {
    (groups[item.item_date] ??= []).push(item); return groups;
  }, {})).sort(([a], [b]) => a.localeCompare(b)), [items]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!title.trim()) return setMessage("Enter the planned activity or reservation.");
    setSaving(true);
    const { data, error } = await addItineraryItemAction({ tripId, itemDate, startTime, category, title, location, confirmationNumber, notes, clientVisible });
    setSaving(false);
    if (error || !data) return setMessage(error ?? "Scout could not add that plan.");
    setItems((current) => [...current, data]); setTitle(""); setLocation(""); setConfirmationNumber(""); setNotes(""); setStartTime("");
    setMessage("Itinerary plan added."); router.refresh();
  }

  async function removeItem(itemId: string) {
    if (!window.confirm("Delete this itinerary plan?")) return;
    const { error } = await deleteItineraryItemAction(tripId, itemId);
    if (error) return setMessage(error);
    setItems((current) => current.filter((item) => item.id !== itemId)); router.refresh();
  }

  return <section data-testid="daily-itinerary-planner" className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Client Itinerary</p><h2 className="mt-2 text-2xl font-bold">Daily Plans</h2><p className="mt-1 text-sm text-slate-600">Build the printable schedule for parks, dining, activities, and travel.</p></div><a href={`/api/trips/${tripId}/itinerary`} className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-center font-semibold text-sky-800 hover:bg-sky-100">Download PDF</a></div>
    <form onSubmit={addItem} className="mt-6 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium">Day<input required type="date" value={itemDate} onChange={(event) => setItemDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-medium">Time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-2">Plan or reservation<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Magic Kingdom, dinner at 'Ohana..." className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-medium">Location<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Park, resort, restaurant" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-medium">Confirmation<input value={confirmationNumber} onChange={(event) => setConfirmationNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
        <label className="text-sm font-medium md:col-span-2">Client notes<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Arrival instructions, suggestions, reminders" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3" /></label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} /> Include in client PDF and portal</label><button disabled={saving} className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-50">{saving ? "Adding..." : "Add to Itinerary"}</button></div>
    </form>
    {message && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
    <div className="mt-6 space-y-5">{days.length ? days.map(([date, plans]) => <div key={date}><h3 className="font-bold text-sky-800">{formatDay(date)}</h3><div className="mt-2 space-y-2">{plans.sort(sortPlans).map((plan) => <div key={plan.id} className="flex gap-4 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4"><div className="w-20 shrink-0 text-sm font-bold text-slate-700">{formatTime(plan.start_time)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">{plan.category}</span>{!plan.client_visible && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Advisor only</span>}</div><p className="mt-2 font-bold">{plan.title}</p>{plan.location && <p className="text-sm text-slate-600">{plan.location}</p>}{plan.confirmation_number && <p className="mt-1 text-sm">Confirmation: {plan.confirmation_number}</p>}{plan.notes && <p className="mt-2 text-sm text-slate-600">{plan.notes}</p>}</div><button type="button" aria-label={`Delete ${plan.title}`} onClick={() => removeItem(plan.id)} className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button></div>)}</div></div>) : <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold">No daily plans yet</p><p className="mt-1 text-sm text-slate-600">Add the client&apos;s parks, dining, and activities above.</p></div>}</div>
  </section>;
}

function sortPlans(a: Tables<"itinerary_items">, b: Tables<"itinerary_items">) { return (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99") || a.sort_order - b.sort_order; }
function formatDay(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); }
function formatTime(value: string | null) { if (!value) return "Any time"; const [hour, minute] = value.split(":").map(Number); return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
