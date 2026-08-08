import Link from "next/link";
import { notFound } from "next/navigation";
import { createAuthorizedClient } from "@/lib/auth";
import { decryptCardField, getPaymentEncryptionKey } from "@/lib/payment-encryption";

type Props = { params: Promise<{ id: string; credentialId: string }> };

export default async function ProxyPaymentPage({ params }: Props) {
  const { id, credentialId } = await params;
  const supabase = await createAuthorizedClient();
  const [{ data: credentialJson, error }, { data: authData }] = await Promise.all([
    supabase.rpc("get_proxy_payment_credential", { target_credential_id: credentialId }),
    supabase.auth.getUser(),
  ]);
  const credential = credentialJson as null | {
    id: string; organization_id: string; client_id: string; provider: string;
    display_label: string; brand: string | null; last_four: string | null;
    expiration_month: number | null; expiration_year: number | null;
    encrypted_pan: string | null; encrypted_cvc: string | null; status: string;
  };
  if (error || !credential || credential.client_id !== id || credential.status !== "active") notFound();
  if (!authData.user) notFound();

  const key = credential.encrypted_pan ? getPaymentEncryptionKey() : null;
  const cardNumber = key && credential.encrypted_pan
    ? decryptCardField(Buffer.from(credential.encrypted_pan, "base64"), key)
    : null;
  const cvc = key && credential.encrypted_cvc
    ? decryptCardField(Buffer.from(credential.encrypted_cvc, "base64"), key)
    : null;

  await supabase.from("payment_credential_events").insert({
    organization_id: credential.organization_id,
    credential_id: credential.id,
    actor_user_id: authData.user.id,
    action: "use_requested",
    outcome: cardNumber ? "encrypted_card_displayed" : "encrypted_card_unavailable",
    metadata: { sandbox: true, workflow: "scout_encrypted" },
  });

  return <main className="min-h-screen bg-[#f6f8f7] p-8 text-slate-900">
    <div className="mx-auto max-w-3xl">
      <Link href={`/clients/${id}`} className="text-sm font-semibold text-sky-700">← Back to client</Link>
      <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-widest text-amber-800">Sandbox card storage</p><h1 className="mt-2 text-3xl font-bold">{credential.display_label}</h1></div>
          <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase text-amber-900">Test cards only</span>
        </div>
        <p className="mt-4 leading-7 text-slate-700">Scout stores this card encrypted and only decrypts it here, for you. Copy it directly into the supplier checkout when you are ready to book.</p>
      </section>

      {cardNumber ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="text-sm font-semibold text-slate-500">Stored card</dt><dd className="mt-2 rounded-xl border border-slate-300 bg-white p-4 font-mono text-xl tracking-wider">{cardNumber}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-500">Expiration</dt><dd className="mt-2 rounded-xl border border-slate-300 bg-white p-4 font-mono text-xl">{credential.expiration_month?.toString().padStart(2, "0")}/{credential.expiration_year?.toString().slice(-2)}</dd></div>
            <div><dt className="text-sm font-semibold text-slate-500">Security code</dt><dd className="mt-2 rounded-xl border border-slate-300 bg-white p-4 font-mono text-xl">{cvc ?? "Expired"}</dd></div>
          </dl>
          {!cvc && <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Ask the client to provide a new security code shortly before booking. Scout only keeps it for a short window.</p>}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-7">
          <p className="text-sm font-semibold text-slate-700">This card can no longer be revealed — it used an older integration. Ask the client to re-submit their card through the trip portal.</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-6">
        <h2 className="text-xl font-bold">Before submitting payment</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
          <li>Confirm the supplier and authorized amount match the client&apos;s approval.</li>
          <li>Copy the card only when you are ready to book.</li>
          <li>Paste the number into the approved supplier&apos;s checkout.</li>
          <li>Do not use this sandbox workflow for a real payment.</li>
        </ol>
      </section>
    </div>
  </main>;
}
