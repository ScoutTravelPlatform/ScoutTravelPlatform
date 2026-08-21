"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addQuoteAction, addQuoteOptionAction, deleteQuoteAction, deleteQuoteOptionAction, setQuoteOptionRecommendationAction, setQuoteStatusAction, setQuoteVisibilityAction, updateQuoteOptionAction } from "@/app/actions/trip-workspace";
import { findOrCreateDestinationAction, findOrCreateSupplierAction, findOrCreateSupplierByDestinationAction, findOrCreateSupplierPropertyAction, findOrCreateSupplierRoomOptionAction, searchDestinationsAction, searchSupplierPropertiesAction, searchSupplierRoomOptionsAction, searchSuppliersAction, searchSuppliersByDestinationAction } from "@/app/actions/suppliers";
import CatalogCombobox, { type CatalogOption } from "@/app/components/CatalogCombobox";
import type { Tables } from "@/lib/supabase/database.types";

type QuoteStatus = Tables<"trip_quotes">["status"];
type TripOption = { id: string; tripName: string; destination: string; clientName: string };
type QuoteOption = {
  id: string;
  quote_id: string;
  title: string;
  supplier: string;
  resort_name: string | null;
  room_option: string | null;
  image_url: string | null;
  total_amount: number;
  deposit_amount: number | null;
  is_recommended: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type QuoteItem = Tables<"trip_quotes"> & TripOption & { options?: QuoteOption[] };
type View = "all" | "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
const statuses: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

export default function QuoteWorkspace({ initialQuotes, trips }: { initialQuotes: QuoteItem[]; trips: TripOption[] }) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [view, setView] = useState<View>("all");
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [optionQuoteId, setOptionQuoteId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const emptyOptionDraft = { title: "", destinationName: "", destinationId: null as string | null, supplier: "", supplierId: null as string | null, resortName: "", propertyId: null as string | null, roomOption: "", imageUrl: "", totalAmount: "", depositAmount: "", notes: "", isRecommended: false };
  const [optionDraft, setOptionDraft] = useState(emptyOptionDraft);
  const [optionSubmitting, setOptionSubmitting] = useState(false);

  const visibleQuotes = useMemo(() => quotes.filter((quote) => view === "all" || quote.status === view), [quotes, view]);
  const pipelineValue = quotes.filter((quote) => !["Declined", "Expired"].includes(quote.status)).reduce((sum, quote) => sum + Number(quote.total_amount), 0);
  const acceptedValue = quotes.filter((quote) => quote.status === "Accepted").reduce((sum, quote) => sum + Number(quote.total_amount), 0);

  async function addQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const amount = Number(totalAmount);
    const deposit = depositAmount ? Number(depositAmount) : null;
    if (!tripId || !title.trim() || !supplier.trim() || !Number.isFinite(amount) || amount < 0) return setMessage("Complete the trip, quote name, supplier, and amount.");
    setAdding(true);
    const result = await addQuoteAction({ tripId, title, supplier, totalAmount: amount, depositAmount: deposit, expiresOn, notes });
    setAdding(false);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not add that quote.");
    const trip = trips.find((item) => item.id === tripId);
    if (trip) setQuotes((current) => [{
      ...result.data,
      tripName: trip.tripName,
      destination: trip.destination,
      clientName: trip.clientName,
    }, ...current]);
    setTitle(""); setDestination(""); setDestinationId(null); setSupplier(""); setTotalAmount(""); setDepositAmount(""); setExpiresOn(""); setNotes(""); setFormOpen(false);
    router.refresh();
  }

  async function changeStatus(quote: QuoteItem, status: QuoteStatus) {
    setMessage("");
    const result = await setQuoteStatusAction(quote.trip_id, quote.id, status);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not update that quote.");
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, ...result.data } : item));
    router.refresh();
  }

  async function removeQuote(quote: QuoteItem) {
    setMessage("");
    const result = await deleteQuoteAction(quote.trip_id, quote.id);
    if (result.error) return setMessage(result.error);
    setQuotes((current) => current.filter((item) => item.id !== quote.id));
    router.refresh();
  }

  async function toggleClientVisibility(quote: QuoteItem) {
    setMessage("");
    const result = await setQuoteVisibilityAction(quote.trip_id, quote.id, !quote.client_visible);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not update client access.");
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, ...result.data } : item));
    router.refresh();
  }

  function openOptionForm(quote: QuoteItem) {
    setOptionQuoteId(quote.id);
    setEditingOptionId(null);
    setOptionDraft({ ...emptyOptionDraft, supplier: quote.supplier });
  }

  function startEditOption(quote: QuoteItem, option: QuoteOption) {
    setOptionQuoteId(quote.id);
    setEditingOptionId(option.id);
    setOptionDraft({
      ...emptyOptionDraft,
      title: option.title,
      supplier: option.supplier,
      resortName: option.resort_name ?? "",
      roomOption: option.room_option ?? "",
      imageUrl: option.image_url ?? "",
      totalAmount: String(option.total_amount),
      depositAmount: option.deposit_amount != null ? String(option.deposit_amount) : "",
      notes: option.notes ?? "",
      isRecommended: option.is_recommended,
    });
  }

  function closeOptionForm() {
    setOptionQuoteId(null);
    setEditingOptionId(null);
    setOptionDraft(emptyOptionDraft);
  }

  async function submitOption(quote: QuoteItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const amount = Number(optionDraft.totalAmount);
    const deposit = optionDraft.depositAmount ? Number(optionDraft.depositAmount) : null;
    if (!quote.id || !optionDraft.title.trim() || !optionDraft.supplier.trim() || !Number.isFinite(amount) || amount < 0) {
      return setMessage("Complete the option title, supplier, and price before saving.");
    }
    setOptionSubmitting(true);
    const result = editingOptionId
      ? await updateQuoteOptionAction({ optionId: editingOptionId, quoteId: quote.id, tripId: quote.trip_id, title: optionDraft.title, supplier: optionDraft.supplier, resortName: optionDraft.resortName || null, roomOption: optionDraft.roomOption || null, imageUrl: optionDraft.imageUrl || null, totalAmount: amount, depositAmount: deposit, notes: optionDraft.notes || null, isRecommended: optionDraft.isRecommended, sortOrder: 0 })
      : await addQuoteOptionAction({ quoteId: quote.id, tripId: quote.trip_id, title: optionDraft.title, supplier: optionDraft.supplier, resortName: optionDraft.resortName || null, roomOption: optionDraft.roomOption || null, imageUrl: optionDraft.imageUrl || null, totalAmount: amount, depositAmount: deposit, notes: optionDraft.notes || null, isRecommended: optionDraft.isRecommended, sortOrder: 0 });
    setOptionSubmitting(false);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not save that option.");
    setQuotes((current) => current.map((item) => {
      if (item.id !== quote.id) return item;
      const options = editingOptionId
        ? (item.options ?? []).map((entry) => entry.id === editingOptionId ? result.data! : entry)
        : [...(item.options ?? []), result.data!];
      return { ...item, options };
    }));
    closeOptionForm();
    router.refresh();
  }

  async function toggleRecommend(quote: QuoteItem, option: QuoteOption) {
    setMessage("");
    const result = await setQuoteOptionRecommendationAction(quote.trip_id, quote.id, option.id, !option.is_recommended);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not update that recommendation.");
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, options: (item.options ?? []).map((entry) => entry.id === option.id ? result.data : entry) } : item));
    router.refresh();
  }

  async function removeOption(quote: QuoteItem, option: QuoteOption) {
    setMessage("");
    const result = await deleteQuoteOptionAction(quote.trip_id, quote.id, option.id);
    if (result.error) return setMessage(result.error);
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, options: (item.options ?? []).filter((entry) => entry.id !== option.id) } : item));
    router.refresh();
  }

  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Active quote value" value={formatMoney(pipelineValue)} />
        <Metric label="Accepted value" value={formatMoney(acceptedValue)} />
        <Metric label="Open quotes" value={String(quotes.filter((quote) => ["Draft", "Sent"].includes(quote.status)).length)} />
      </section>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => setFormOpen((open) => !open)} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white transition hover:bg-[#0c5963]">{formOpen ? "Close form" : "Create quote"}</button>
      </div>

      {formOpen && <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#243c57]">New quote</h2>
        <p className="mt-1 text-sm text-slate-500">Record an option now; client-ready quote documents can be added in a later phase.</p>
        <form onSubmit={addQuote} className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Trip"><select value={tripId} onChange={(event) => setTripId(event.target.value)} className={inputClasses} required>{trips.length ? trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.clientName} — {trip.tripName}</option>) : <option value="">Add a trip first</option>}</select></Field>
          <Field label="Quote name"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resort package option" className={inputClasses} required /></Field>
          <CatalogCombobox
            label="Destination"
            value={destination}
            placeholder="Walt Disney World Resort"
            onTextChange={setDestination}
            onSelect={(option: CatalogOption) => {
              if (option.id !== destinationId) setSupplier("");
              setDestination(option.name);
              setDestinationId(option.id);
            }}
            search={(query) => searchDestinationsAction(query)}
            create={(name) => findOrCreateDestinationAction(name)}
            inputClassName={inputClasses}
            labelClassName="text-sm font-semibold text-slate-700"
          />
          <CatalogCombobox
            label="Supplier"
            value={supplier}
            placeholder="Disney Destinations"
            onTextChange={setSupplier}
            onSelect={(option: CatalogOption) => setSupplier(option.name)}
            search={(query) => destinationId ? searchSuppliersByDestinationAction({ destinationId, query }) : searchSuppliersAction(query)}
            create={(name) => destinationId ? findOrCreateSupplierByDestinationAction({ destinationId, name }) : findOrCreateSupplierAction(name)}
            inputClassName={inputClasses}
            labelClassName="text-sm font-semibold text-slate-700"
          />
          <Field label="Total price"><input type="number" min="0" step="0.01" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} placeholder="0.00" className={inputClasses} required /></Field>
          <Field label="Deposit"><input type="number" min="0" step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} placeholder="Optional" className={inputClasses} /></Field>
          <Field label="Quote expires"><input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className={inputClasses} /></Field>
          <label className="md:col-span-2"><span className="text-sm font-semibold text-slate-700">Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Room type, inclusions, or important conditions" className={`${inputClasses} mt-2 w-full resize-y`} /></label>
          <div className="md:col-span-2 flex justify-end"><button disabled={adding || !trips.length} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white hover:bg-[#0c5963] disabled:cursor-not-allowed disabled:opacity-50">{adding ? "Saving…" : "Save quote"}</button></div>
        </form>
      </section>}

      {message && <p role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</p>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold text-[#243c57]">Quote pipeline</h2><p className="mt-1 text-sm text-slate-500">{visibleQuotes.length} quote{visibleQuotes.length === 1 ? "" : "s"} in this view</p></div>
          <div className="flex flex-wrap gap-2">{(["all", ...statuses] as View[]).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${view === item ? "border-[#0f6d78] bg-[#0f6d78] text-white" : "border-slate-300 bg-white text-slate-600 hover:border-[#0f6d78] hover:text-[#0f6d78]"}`}>{item}</button>)}</div>
        </div>
        {visibleQuotes.length ? <div className="divide-y divide-slate-100">{visibleQuotes.map((quote) => (
          <article key={quote.id} className="grid gap-5 px-5 py-5 xl:grid-cols-[1.3fr_.8fr_.7fr_auto] xl:items-center">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#243c57]">{quote.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(quote.status)}`}>{quote.status}</span></div><p className="mt-1 text-sm text-slate-500">{quote.clientName} · {quote.tripName}</p><p className="mt-1 text-sm text-slate-500">{quote.supplier}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Quoted total</p><p className="mt-1 text-lg font-semibold text-[#243c57]">{formatMoney(Number(quote.total_amount))}</p>{quote.deposit_amount != null && <p className="text-sm text-slate-500">{formatMoney(Number(quote.deposit_amount))} deposit</p>}</div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Expires</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(quote.expires_on)}</p></div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button type="button" onClick={() => toggleClientVisibility(quote)} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${quote.client_visible ? "border-[#0f6d78] bg-[#dceff0] text-[#0f6d78]" : "border-slate-300 bg-white text-slate-600 hover:border-[#0f6d78] hover:text-[#0f6d78]"}`}>{quote.client_visible ? "Shared in portal" : "Share with client"}</button>
              <select aria-label={`Status for ${quote.title}`} value={quote.status} onChange={(event) => changeStatus(quote, event.target.value as QuoteStatus)} className="rounded-lg border border-slate-300 bg-[#f7faf9] px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f6d78]">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
              <Link href={`/trips/${quote.trip_id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0f6d78] hover:bg-[#edf7f7]">Open trip</Link>
              <button type="button" onClick={() => removeQuote(quote)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">Delete</button>
            </div>
            <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-[#f7faf9] p-4">
              <div className="flex items-center justify-between"><div><h4 className="font-semibold text-[#243c57]">Resort options</h4><p className="mt-1 text-sm text-slate-500">Add 2–3 alternatives with an image and a recommended pick.</p></div><button type="button" onClick={() => openOptionForm(quote)} className="rounded-lg bg-[#0f6d78] px-3 py-2 text-sm font-semibold text-white">Add option</button></div>
              {optionQuoteId === quote.id && <form onSubmit={(event) => submitOption(quote, event)} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                <p className="text-sm font-semibold text-[#243c57] md:col-span-2">{editingOptionId ? "Edit option" : "Add a resort option"}</p>
                <label className="text-sm font-semibold text-slate-700"><span>Option title</span><input value={optionDraft.title} onChange={(event) => setOptionDraft((current) => ({ ...current, title: event.target.value }))} className={inputClasses} placeholder="Grand villa" required /></label>
                <CatalogCombobox
                  label="Destination"
                  value={optionDraft.destinationName}
                  placeholder="Walt Disney World Resort"
                  onTextChange={(text) => setOptionDraft((current) => ({ ...current, destinationName: text }))}
                  onSelect={(option: CatalogOption) => setOptionDraft((current) => current.destinationId === option.id
                    ? { ...current, destinationName: option.name, destinationId: option.id }
                    : { ...current, destinationName: option.name, destinationId: option.id, supplier: "", supplierId: null, resortName: "", propertyId: null, roomOption: "" })}
                  search={(query) => searchDestinationsAction(query)}
                  create={(name) => findOrCreateDestinationAction(name)}
                  inputClassName={inputClasses}
                  labelClassName="text-sm font-semibold text-slate-700"
                />
                <CatalogCombobox
                  label="Supplier"
                  value={optionDraft.supplier}
                  placeholder="Disney Destinations"
                  onTextChange={(text) => setOptionDraft((current) => ({ ...current, supplier: text }))}
                  onSelect={(option: CatalogOption) => setOptionDraft((current) => current.supplierId === option.id
                    ? { ...current, supplier: option.name, supplierId: option.id }
                    : { ...current, supplier: option.name, supplierId: option.id, resortName: "", propertyId: null, roomOption: "" })}
                  search={(query) => optionDraft.destinationId ? searchSuppliersByDestinationAction({ destinationId: optionDraft.destinationId, query }) : searchSuppliersAction(query)}
                  create={(name) => optionDraft.destinationId ? findOrCreateSupplierByDestinationAction({ destinationId: optionDraft.destinationId, name }) : findOrCreateSupplierAction(name)}
                  inputClassName={inputClasses}
                  labelClassName="text-sm font-semibold text-slate-700"
                />
                <CatalogCombobox
                  label="Resort / hotel"
                  value={optionDraft.resortName}
                  disabled={!optionDraft.supplierId && !optionDraft.resortName}
                  placeholder={optionDraft.supplierId ? "Old Key West" : "Choose a supplier first"}
                  onTextChange={(text) => setOptionDraft((current) => ({ ...current, resortName: text }))}
                  onSelect={(option: CatalogOption) => setOptionDraft((current) => current.propertyId === option.id
                    ? { ...current, resortName: option.name, propertyId: option.id }
                    : { ...current, resortName: option.name, propertyId: option.id, roomOption: "" })}
                  search={(query) => searchSupplierPropertiesAction({ supplierId: optionDraft.supplierId ?? "", query })}
                  create={(name) => findOrCreateSupplierPropertyAction({ supplierId: optionDraft.supplierId ?? "", name })}
                  inputClassName={inputClasses}
                  labelClassName="text-sm font-semibold text-slate-700"
                />
                <CatalogCombobox
                  label="Room option"
                  value={optionDraft.roomOption}
                  disabled={!optionDraft.propertyId && !optionDraft.roomOption}
                  placeholder={optionDraft.propertyId ? "Deluxe Studio" : "Choose a resort or hotel first"}
                  onTextChange={(text) => setOptionDraft((current) => ({ ...current, roomOption: text }))}
                  onSelect={(option: CatalogOption) => setOptionDraft((current) => ({ ...current, roomOption: option.name }))}
                  search={(query) => searchSupplierRoomOptionsAction({ propertyId: optionDraft.propertyId ?? "", query })}
                  create={(name) => findOrCreateSupplierRoomOptionAction({ propertyId: optionDraft.propertyId ?? "", name })}
                  inputClassName={inputClasses}
                  labelClassName="text-sm font-semibold text-slate-700"
                />
                <label className="text-sm font-semibold text-slate-700"><span>Image URL</span><input value={optionDraft.imageUrl} onChange={(event) => setOptionDraft((current) => ({ ...current, imageUrl: event.target.value }))} className={inputClasses} placeholder="https://..." /></label>
                <label className="text-sm font-semibold text-slate-700"><span>Total price</span><input type="number" min="0" step="0.01" value={optionDraft.totalAmount} onChange={(event) => setOptionDraft((current) => ({ ...current, totalAmount: event.target.value }))} className={inputClasses} required /></label>
                <label className="text-sm font-semibold text-slate-700"><span>Deposit</span><input type="number" min="0" step="0.01" value={optionDraft.depositAmount} onChange={(event) => setOptionDraft((current) => ({ ...current, depositAmount: event.target.value }))} className={inputClasses} /></label>
                <label className="md:col-span-2 text-sm font-semibold text-slate-700"><span>Notes</span><textarea value={optionDraft.notes} onChange={(event) => setOptionDraft((current) => ({ ...current, notes: event.target.value }))} className={`${inputClasses} mt-2 min-h-24 w-full resize-y`} /></label>
                <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={optionDraft.isRecommended} onChange={(event) => setOptionDraft((current) => ({ ...current, isRecommended: event.target.checked }))} className="h-4 w-4 rounded border-slate-300" /> Mark as recommended</label>
                <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={closeOptionForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={optionSubmitting} className="rounded-lg bg-[#0f6d78] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{optionSubmitting ? "Saving…" : editingOptionId ? "Save changes" : "Save option"}</button></div>
              </form>}
              <div className="mt-4 space-y-3">{(quote.options ?? []).map((option) => <div key={option.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-2"><h5 className="font-semibold text-[#243c57]">{option.title}</h5>{option.is_recommended && <span className="rounded-full bg-[#dceff0] px-3 py-1 text-xs font-semibold text-[#0f6d78]">Recommended</span>}</div><p className="mt-1 text-sm text-slate-500">{option.supplier}{option.resort_name ? ` · ${option.resort_name}` : ""}{option.room_option ? ` · ${option.room_option}` : ""}</p></div>
                  <div className="text-right"><p className="text-lg font-semibold text-[#243c57]">{formatMoney(Number(option.total_amount))}</p>{option.deposit_amount != null && <p className="text-sm text-slate-500">{formatMoney(Number(option.deposit_amount))} deposit</p>}</div>
                </div>
                {option.image_url && <img src={option.image_url} alt={option.title} className="mt-4 h-36 w-full rounded-xl object-cover" />}
                {option.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{option.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => startEditOption(quote, option)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-[#0f6d78] hover:text-[#0f6d78]">Edit</button>
                  <button type="button" onClick={() => toggleRecommend(quote, option)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${option.is_recommended ? "border-[#0f6d78] bg-[#dceff0] text-[#0f6d78]" : "border-slate-300 bg-white text-slate-600"}`}>{option.is_recommended ? "Recommended" : "Mark recommended"}</button>
                  <button type="button" onClick={() => removeOption(quote, option)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600">Remove</button>
                </div>
              </div>)}{!(quote.options ?? []).length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No options yet. Add one or two alternatives to help the client compare.</p>}</div>
            </div>
          </article>
        ))}</div> : <div className="p-12 text-center"><p className="font-semibold text-[#243c57]">No quotes in this view</p><p className="mt-2 text-sm text-slate-500">Create the first quote or choose another filter.</p></div>}
      </section>
    </>
  );
}

const inputClasses = "mt-2 w-full rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-[#243c57]">{value}</p></div>; }
function formatMoney(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No expiration"; }
function statusClasses(status: QuoteStatus) { return status === "Accepted" ? "bg-emerald-100 text-emerald-800" : status === "Sent" ? "bg-sky-100 text-sky-800" : status === "Declined" || status === "Expired" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"; }
