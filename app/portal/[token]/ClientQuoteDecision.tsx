"use client";

import { useEffect, useState } from "react";
import { recordQuoteOptionInteractionAction, respondToQuoteAction } from "@/app/actions/client-portal";
import type { ClientPortalData } from "@/lib/client-portal";

type Quote = ClientPortalData["quotes"][number];

export default function ClientQuoteDecision({ token, initialQuotes }: { token: string; initialQuotes: Quote[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [favoriteOptionIds, setFavoriteOptionIds] = useState<string[]>([]);

  useEffect(() => {
    const quoteIds = initialQuotes.map((quote) => quote.id);
    if (!quoteIds.length || typeof navigator.sendBeacon !== "function") return;
    const startedAt = Date.now();
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      const timeOnPageSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const payload = JSON.stringify({ quoteIds, timeOnPageSeconds });
      navigator.sendBeacon(`/api/portal/${token}/quote-view`, new Blob([payload], { type: "application/json" }));
    };
    const handleVisibility = () => { if (document.visibilityState === "hidden") send(); };
    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", send);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token, initialQuotes]);

  async function recordInteraction(quoteId: string, optionId: string, interactionType: "favorite" | "details" | "compare") {
    const result = await recordQuoteOptionInteractionAction({ token, quoteId, optionId, interactionType });
    if (!result.ok) setMessage(result.error ?? "Scout could not record that interaction.");
  }

  async function respond(quote: Quote, response: "Accepted" | "Declined") {
    const prompt = response === "Accepted"
      ? `Choose “${quote.title}” as your preferred quote? Your advisor will still confirm availability and final booking details.`
      : `Decline “${quote.title}”?`;
    if (!window.confirm(prompt)) return;
    setWorkingId(quote.id);
    setMessage("");
    const result = await respondToQuoteAction({ token, quoteId: quote.id, response });
    setWorkingId(null);
    if (result.error || !result.status) return setMessage(result.error ?? "Scout could not record your response.");
    const confirmedStatus = result.status as "Accepted" | "Declined";
    setQuotes((current) => current.map((item) => {
      if (item.id === quote.id) return { ...item, status: confirmedStatus };
      if (confirmedStatus === "Accepted" && item.status === "Sent") return { ...item, status: "Declined" };
      return item;
    }));
    setMessage(confirmedStatus === "Accepted"
      ? "Thank you. Your advisor has been notified of your preferred option."
      : "Your advisor can see that you declined this option.");
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Your options</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#243c57]">Compare trip quotes</h2>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">Review the options your advisor prepared. Prices and availability are confirmed when your advisor completes the booking.</p>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {quotes.map((quote) => (
          <article key={quote.id} className={`rounded-2xl border p-6 ${quote.status === "Accepted" ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-[#f7faf9]"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-xl font-semibold text-[#243c57]">{quote.title}</h3><p className="mt-1 text-sm font-medium text-slate-500">{quote.supplier}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(quote.status)}`}>{clientStatus(quote.status)}</span>
            </div>
            <p className="mt-6 text-3xl font-semibold text-[#243c57]">{formatMoney(quote.total_amount)}</p>
            {quote.deposit_amount != null && <p className="mt-1 text-sm text-slate-500">{formatMoney(quote.deposit_amount)} deposit</p>}
            {quote.expires_on && <p className="mt-4 text-sm font-medium text-slate-600">Available through {formatDate(quote.expires_on)}</p>}
            {quote.notes && <p className="mt-4 whitespace-pre-wrap border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">{quote.notes}</p>}
            {quote.options.length > 0 && <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Compare options</p>
              {quote.options.map((option) => {
                const isFavorite = favoriteOptionIds.includes(option.id);
                const isExpanded = expandedOptionId === option.id;
                return <div key={option.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  {option.image_url && <img src={option.image_url} alt={option.title} className="mb-4 h-36 w-full rounded-xl object-cover" />}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#243c57]">{option.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{option.supplier}</p>
                    </div>
                    {option.is_recommended && <span className="rounded-full bg-[#dceff0] px-3 py-1 text-xs font-semibold text-[#0f6d78]">Recommended</span>}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[#243c57]">{formatMoney(option.total_amount)}</p>
                  {option.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{option.notes}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setFavoriteOptionIds((current) => current.includes(option.id) ? current : [...current, option.id]); void recordInteraction(quote.id, option.id, "favorite"); }} className={`rounded-full border px-3 py-2 text-sm font-semibold ${isFavorite ? "border-[#0f6d78] bg-[#0f6d78] text-white" : "border-slate-300 bg-white text-slate-600"}`}>Favorite</button>
                    <button type="button" onClick={() => { setExpandedOptionId(isExpanded ? null : option.id); void recordInteraction(quote.id, option.id, "details"); }} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600">{isExpanded ? "Hide details" : "See details"}</button>
                  </div>
                  {isExpanded && option.notes && <p className="mt-3 rounded-xl border border-slate-200 bg-[#f7faf9] p-3 text-sm leading-6 text-slate-600">{option.notes}</p>}
                </div>;
              })}
            </div>}
            {quote.status === "Sent" || quote.status === "Draft" ? <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={workingId !== null} onClick={() => respond(quote, "Accepted")} className="flex-1 rounded-xl bg-[#0f6d78] px-4 py-3 font-bold text-white hover:bg-[#0c5963] disabled:opacity-50">{workingId === quote.id ? "Saving…" : "Choose this option"}</button>
              <button type="button" disabled={workingId !== null} onClick={() => respond(quote, "Declined")} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-50">Decline</button>
            </div> : quote.status === "Accepted" ? <p className="mt-6 rounded-xl bg-emerald-100 p-3 text-center text-sm font-bold text-emerald-800">Your selected option</p> : <p className="mt-6 rounded-xl bg-slate-100 p-3 text-center text-sm font-semibold text-slate-500">Option declined</p>}
          </article>
        ))}
      </div>
      {message && <p role="status" className="mt-6 rounded-xl border border-[#b8dfe1] bg-[#edf7f7] p-4 text-sm font-semibold text-[#0f6d78]">{message}</p>}
    </section>
  );
}

function formatMoney(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }); }
function clientStatus(status: Quote["status"]) { return status === "Accepted" ? "Selected" : status === "Declined" ? "Declined" : "Available"; }
function statusClasses(status: Quote["status"]) { return status === "Accepted" ? "bg-emerald-100 text-emerald-800" : status === "Declined" ? "bg-slate-200 text-slate-600" : "bg-[#dceff0] text-[#0f6d78]"; }
