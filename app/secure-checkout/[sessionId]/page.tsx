import Link from "next/link";
import { notFound } from "next/navigation";
import { createAuthorizedClient } from "@/lib/auth";
import { getSecureCheckoutProvider } from "@/lib/secure-checkout";

type Props = { params: Promise<{ sessionId: string }> };

export default async function SecureCheckoutSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await createAuthorizedClient();
  const { data: session, error } = await supabase.from("secure_checkout_sessions")
    .select("id,client_id,supplier,status,provider,provider_session_reference,expires_at,created_at")
    .eq("id", sessionId)
    .single();
  if (error || !session) notFound();
  const providerReference = session.provider_session_reference;
  const provider = providerReference ? await getSecureCheckoutProvider() : null;
  const operatorUrl = provider && providerReference && session.status === "ready"
    ? await provider.getOperatorUrl(providerReference).catch(() => null)
    : null;

  return <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
    <div className="mx-auto max-w-3xl">
      <Link href={`/clients/${session.client_id}`} className="text-sm font-semibold text-sky-700">← Back to client</Link>
      <section className="mt-6 rounded-2xl border border-sky-300 bg-sky-50 p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-sky-800">Sandbox secure checkout</p>
        <h1 className="mt-2 text-3xl font-bold">Isolated session created</h1>
        <p className="mt-4 leading-7 text-slate-700">Scout recorded and authorized this checkout session without placing payment aliases in the session record.</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm font-semibold text-slate-500">Supplier</dt><dd className="mt-1 font-bold">{session.supplier}</dd></div>
          <div><dt className="text-sm font-semibold text-slate-500">Status</dt><dd className="mt-1 font-bold">{operatorUrl ? "Ready" : "Awaiting hosted browser"}</dd></div>
          <div><dt className="text-sm font-semibold text-slate-500">Environment</dt><dd className="mt-1 font-bold">Sandbox only</dd></div>
          <div><dt className="text-sm font-semibold text-slate-500">Expires</dt><dd className="mt-1 font-bold">{new Date(session.expires_at).toLocaleString()}</dd></div>
        </dl>
      </section>
      {operatorUrl ? <section className="mt-6 overflow-hidden rounded-2xl border border-sky-300 bg-white">
        <div className="border-b border-sky-200 bg-sky-50 p-4"><h2 className="font-bold">Secure supplier browser</h2><p className="text-sm text-slate-600">This isolated session ends automatically.</p></div>
        <iframe src={operatorUrl} title="Secure supplier checkout" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads" allow="clipboard-read; clipboard-write" className="h-[720px] w-full" />
      </section> : <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <h2 className="text-xl font-bold">Provider connection required</h2>
        <p className="mt-2 leading-7 text-slate-700">The secure session controls, live supplier view, MFA handoff, and automatic shutdown will appear here after a hosted operator-browser provider is connected and approved.</p>
      </section>}
    </div>
  </main>;
}
