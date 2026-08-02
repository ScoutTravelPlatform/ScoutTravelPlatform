"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { describeVgsResponseShape, findVgsFieldAlias, findVgsFieldValue } from "@/lib/vgs/aliases";

type VgsFieldState = { isValid: boolean; last4?: string; cardType?: string };
type VgsFormState = Record<string, VgsFieldState> | null;
type VgsForm = {
  field: (selector: string, options: Record<string, unknown>) => unknown;
  createAliases: (
    options: { access_token: string },
    success: (status: unknown, response: unknown) => void,
    failure: () => void,
  ) => void;
  unmount: () => void;
};
declare global {
  interface Window {
    VGSCollect?: { create: (vaultId: string, environment: string, callback: (state: VgsFormState) => void) => VgsForm };
  }
}
const collectScript = "https://js.verygoodvault.com/vgs-collect/3.3.0/vgs-collect.js";
const fieldCss = {
  boxSizing: "border-box",
  height: "48px",
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  color: "#0f172a",
  fontSize: "16px",
  background: "#f8fafc",
  "&::placeholder": { color: "#64748b" },
};

type Props = { token: string; defaultSupplier: string };
export default function SandboxPaymentCardForm({ token, defaultSupplier }: Props) {
  const vaultId = process.env.NEXT_PUBLIC_VGS_VAULT_ID ?? "";
  const [scriptReady, setScriptReady] = useState(false);
  const [formState, setFormState] = useState<VgsFormState>(null);
  const vgsForm = useRef<VgsForm | null>(null);
  const [supplier, setSupplier] = useState(defaultSupplier);
  const [purpose, setPurpose] = useState("Trip reservations and authorized supplier payments");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [label, setLabel] = useState("Primary booking card");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const cardState = formState?.["card-number"];
  const ready = Boolean(
    cardState?.isValid &&
    formState?.["card-expiration"]?.isValid &&
    formState?.["card-cvc"]?.isValid
  );
  const canSubmit = ready && consent && supplier.trim() && purpose.trim() && label.trim() && !saving;
  const authHandler = useMemo(() => async () => {
    const response = await fetch(`/api/portal/${token}/vgs-collect-token`, { method: "POST", cache: "no-store" });
    if (!response.ok) throw new Error("Secure card entry is unavailable");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("accessToken" in data) || typeof data.accessToken !== "string") {
      throw new Error("Secure card entry is unavailable");
    }
    return data.accessToken;
  }, [token]);

  useEffect(() => {
    if (!scriptReady || !window.VGSCollect || vgsForm.current) return;
    const form = window.VGSCollect.create(vaultId, "sandbox", setFormState);
    form.field("#vgs-card-number", {
      type: "card-number", name: "card-number", placeholder: "VGS test card number",
      validations: ["required", "validCardNumber"], showCardIcon: true,
      tokenization: { format: "FPE_SIX_T_FOUR", storage: "PERSISTENT" }, css: fieldCss,
    });
    form.field("#vgs-card-expiration", {
      type: "card-expiration-date", name: "card-expiration", placeholder: "MM/YY",
      validations: ["required", "validCardExpirationDate"], yearLength: 2,
      tokenization: false, css: fieldCss,
    });
    form.field("#vgs-card-cvc", {
      type: "card-security-code", name: "card-cvc", placeholder: "CVV",
      validations: ["required", "validCardSecurityCode"],
      tokenization: { format: "NUM_LENGTH_PRESERVING", storage: "VOLATILE" }, css: fieldCss,
    });
    vgsForm.current = form;
    return () => { form.unmount(); vgsForm.current = null; };
  }, [scriptReady, vaultId]);

  async function handleVgsSuccess(status: unknown, response: unknown) {
    const panReference = findVgsFieldAlias(response, "card-number") ?? findVgsFieldAlias(status, "card-number");
    const expiration = findVgsFieldValue(response, "card-expiration") ?? findVgsFieldValue(status, "card-expiration");
    const cvcReference = findVgsFieldAlias(response, "card-cvc") ?? findVgsFieldAlias(status, "card-cvc");
    const expirationMatch = expiration?.match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
    if (!panReference || !expirationMatch || !cvcReference || !cardState?.last4) {
      console.warn("VGS alias callback shapes:", {
        status: describeVgsResponseShape(status),
        response: describeVgsResponseShape(response),
      });
      setSaving(false);
      setMessage("VGS protected the card, but Scout could not identify the returned aliases.");
      return;
    }
    const amount = maximumAmount.trim() ? Number(maximumAmount) : null;
    const saveResponse = await fetch(`/api/portal/${token}/payment-credentials`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        panReference,
        expirationMonth: Number(expirationMatch[1]),
        expirationYear: Number(expirationMatch[2].length === 2 ? `20${expirationMatch[2]}` : expirationMatch[2]),
        cvcReference,
        brand: cardState.cardType ?? "Card",
        lastFour: cardState.last4,
        label,
        supplier,
        purpose,
        maximumAmount: amount,
        consent,
      }),
    });
    setSaving(false);
    if (!saveResponse.ok) {
      const result = await saveResponse.json().catch(() => null) as { error?: string } | null;
      setMessage(result?.error ?? "Scout could not save the protected card.");
      return;
    }
    setMessage(`Test card ending ${cardState.last4} was saved persistently and securely for this trip.`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !vgsForm.current) return;
    setSaving(true);
    setMessage("Protecting test card with VGS...");
    try {
      const accessToken = await authHandler();
      vgsForm.current.createAliases(
        // Collect.js adds the Bearer scheme when it builds the request header.
        { access_token: accessToken },
        handleVgsSuccess,
        () => { setSaving(false); setMessage("Check the protected card fields and try again."); },
      );
    } catch {
      setSaving(false);
      setMessage("Secure card entry is temporarily unavailable.");
    }
  }

  if (!vaultId) return null;

  return <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 md:p-8">
    <Script src={collectScript} strategy="afterInteractive" onLoad={() => setScriptReady(true)} onReady={() => setScriptReady(true)} />
    <p className="text-sm font-bold uppercase tracking-widest text-amber-800">Sandbox Test Only</p>
    <h2 className="mt-2 text-2xl font-bold">Add a protected booking card</h2>
    <p className="mt-3 max-w-3xl leading-7 text-slate-700">Use a VGS test card only. Scout cannot read the card fields and stores only protected VGS references and masked details. Do not enter a real card yet.</p>
    {!scriptReady ? <p className="mt-6 font-semibold">Loading secure card fields...</p> :
      <form onSubmit={submit}>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-sm font-semibold">Card number</span><span id="vgs-card-number" className="block min-h-12" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Expiration</span><span id="vgs-card-expiration" className="block min-h-12" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Security code</span><span id="vgs-card-cvc" className="block min-h-12" /><span className="mt-1 block text-xs text-slate-500">Protected temporarily by VGS and expires within one hour.</span></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Card label</span><input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Approved supplier</span><input value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={150} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold">Authorized purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={500} rows={2} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Maximum authorized amount (optional)</span><input type="number" min="0.01" step="0.01" value={maximumAmount} onChange={(event) => setMaximumAmount(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3" /></label>
        </div>
        <label className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /><span className="text-sm leading-6">I authorize my travel advisor to use this protected card only for the supplier, purpose, and maximum amount stated above for this trip.</span></label>
        <button type="submit" disabled={!canSubmit} className="mt-5 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Protecting..." : "Save protected test card"}</button>
        {message && <p role="status" className="mt-4 font-semibold text-slate-700">{message}</p>}
      </form>}
  </section>;
}
