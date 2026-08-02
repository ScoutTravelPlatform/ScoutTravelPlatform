"use client";

import Script from "next/script";
import { useRef, useState } from "react";

type VgsFrame = {
  render(selector: string, css: Record<string, unknown>): void;
  on(event: string, callback: (error?: { message?: string; status?: number }) => void): void;
  unmount(): void;
};
type VgsShow = {
  setEnvironment(environment: string): VgsShow;
  setCname(cname: string): VgsShow;
  request(input: Record<string, unknown>): VgsFrame;
  copyFrom(frame: VgsFrame, options: Record<string, unknown>, callback: (status: string) => void): VgsFrame;
};
declare global {
  interface Window {
    VGSShow?: { create(vaultId: string, callback: (state: unknown) => void): VgsShow };
  }
}

const showScript = "https://js.verygoodvault.com/vgs-show/2.2.2/show.js";
const showIntegrity = "sha384-70nFlhYfZpPZ0nh4E9kRCT2HXORAKatDFQXQP8Dxq8motfd35aSMMu9g6VE/oAIV";

export default function SecureCardDisplay({ alias, revealToken }: { alias: string; revealToken: string }) {
  const vaultId = process.env.NEXT_PUBLIC_VGS_VAULT_ID ?? "";
  const showCname = process.env.NEXT_PUBLIC_VGS_SHOW_CNAME ?? "";
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState("");
  const [requested, setRequested] = useState(false);
  const frames = useRef<VgsFrame[]>([]);

  function reveal() {
    if (!window.VGSShow || !vaultId || requested) return;
    setRequested(true);
    setStatus("Opening the protected card…");
    const show = window.VGSShow.create(vaultId, () => undefined).setEnvironment("sandbox");
    if (showCname) show.setCname(showCname);
    const cardFrame = show.request({
      name: "scout-card-number",
      method: "POST",
      path: "/api/secure-card-display",
      payload: { card_number: alias },
      headers: { Authorization: `Bearer ${revealToken}` },
      htmlWrapper: "text",
      jsonPathSelector: "json.card_number",
      serializers: [
        // Formatting occurs inside VGS's iframe, never in Scout's DOM.
        // @ts-expect-error VGS exposes serializers at runtime but not through a published TypeScript package.
        show.SERIALIZERS?.replace?.("(\\d{4})(\\d{4})(\\d{4})(\\d{4})", "$1 $2 $3 $4"),
      ].filter(Boolean),
    });
    cardFrame.on("requestSuccess", () => setStatus("VGS received the protected card response…"));
    cardFrame.on("revealSuccess", () => setStatus("Card opened securely by VGS."));
    cardFrame.on("requestFail", (error) => {
      console.warn("VGS secure-card request failed", { message: error?.message, status: error?.status });
      setRequested(false);
      setStatus("The secure card could not be opened. Refresh this page and try again.");
    });
    cardFrame.on("revealFail", (error) => {
      console.warn("VGS secure-card reveal failed", { message: error?.message, status: error?.status });
      setRequested(false);
      setStatus("VGS could not reveal this card. Refresh this page and try again.");
    });
    cardFrame.render("#vgs-show-card-number", {
      "box-sizing": "border-box",
      color: "#0f172a",
      "font-family": "SFMono-Regular, Consolas, monospace",
      "font-size": "20px",
      "font-weight": "700",
      "letter-spacing": "0.08em",
      padding: "14px",
    });
    const copyFrame = show.copyFrom(cardFrame, { text: "Copy card number" }, (copyStatus) => {
      if (copyStatus.toLowerCase() === "success") setStatus("Card number copied securely. Paste it into the supplier checkout.");
    });
    copyFrame.render("#vgs-show-copy-card", {
      "background-color": "#0369a1",
      "border-radius": "8px",
      color: "#ffffff",
      cursor: "pointer",
      "font-family": "Arial, sans-serif",
      "font-size": "14px",
      "font-weight": "700",
      padding: "12px 16px",
      "text-align": "center",
    });
    frames.current = [cardFrame, copyFrame];
  }

  return (
    <section className="mt-6 rounded-2xl border border-sky-300 bg-sky-50 p-6">
      <Script
        src={showScript}
        integrity={showIntegrity}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <p className="text-sm font-bold uppercase tracking-widest text-sky-800">VGS secure display</p>
      <h2 className="mt-2 text-xl font-bold">Use this card in the supplier website</h2>
      <p className="mt-2 leading-7 text-slate-700">
        VGS opens the full card number in a protected field and copies it without exposing it to Scout. Stay in your preferred browser and paste it into the supplier checkout.
      </p>
      {!requested && (
        <button type="button" onClick={reveal} disabled={!scriptReady} className="mt-4 rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {scriptReady ? "Reveal card securely" : "Loading VGS…"}
        </button>
      )}
      <div className={requested ? "mt-5 grid gap-3 sm:grid-cols-[1fr_180px]" : "hidden"}>
        <div id="vgs-show-card-number" className="min-h-14 overflow-hidden rounded-xl border border-slate-300 bg-white" />
        <div id="vgs-show-copy-card" className="min-h-12 overflow-hidden rounded-lg" />
      </div>
      {status && <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}
      <p className="mt-4 text-xs leading-5 text-slate-500">This authorization expires after five minutes. Refresh the page to create a new one.</p>
    </section>
  );
}
