import Link from "next/link";
import { createAuthorizedClient } from "@/lib/auth";
import { isStripeBillingConfigured } from "@/lib/billing";

type Props = { searchParams: Promise<{ checkout?: string; setup?: string; error?: string; seats?: string }> };

export default async function BillingPage({ searchParams }: Props) {
  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: membership } = authData.user
    ? await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", authData.user.id).limit(1).maybeSingle()
    : { data: null };
  if (!membership) return null;
  const canManage = membership.role === "owner" || membership.role === "admin";
  if (!canManage) {
    return <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8"><div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Organization billing</p><h1 className="mt-3 text-3xl font-semibold text-[#243c57]">Billing is managed by your agency</h1><p className="mt-3 leading-7 text-slate-600">Only organization owners and administrators can start or change Scout subscriptions.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[#0f6d78] px-5 py-3 font-bold text-white">Return to dashboard</Link></div></main>;
  }

  const [{ data: organization }, billingResult, { count: advisors }, { count: clients }, invoicesResult, paymentsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).maybeSingle(),
    supabase.from("organization_billing").select("*").eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("organization_memberships").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id).eq("role", "advisor"),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", membership.organization_id),
    supabase.from("organization_billing_invoices").select("id, provider_invoice_id, status, currency, amount_due, amount_paid, amount_remaining, hosted_invoice_url, invoice_pdf, due_date, paid_at, created_at").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(5),
    supabase.from("organization_billing_payments").select("id, provider_payment_id, amount, currency, paid_at, created_at, invoice_id").eq("organization_id", membership.organization_id).order("paid_at", { ascending: false }).limit(10),
  ]);
  const params = await searchParams;
  const billing = billingResult.data;
  const currency = "USD";
  const configured = isStripeBillingConfigured();
  const active = billing && ["trialing", "active", "past_due", "paused", "unpaid"].includes(billing.status);

  return <main className="min-h-screen bg-[#f6f8f7] p-5 text-slate-900 md:p-8"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-200 pb-8"><p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Organization settings</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-[#243c57]">Subscription and billing</h1><p className="mt-2 max-w-3xl text-slate-600">Manage the Scout subscription for {organization?.name ?? "your agency"}. Client portal access remains free and is never counted as a paid seat.</p></header>

    {params.checkout === "success" && <Notice tone="success">Stripe received the subscription checkout. Scout will update the account as soon as the signed webhook arrives.</Notice>}
    {params.checkout === "cancelled" && <Notice tone="neutral">Checkout was cancelled. No Scout subscription change was made.</Notice>}
    {params.seats === "synced" && <Notice tone="success">The Stripe subscription now matches the current Advisor seat count.</Notice>}
    {(params.setup === "required" || !configured) && <Notice tone="warning">Stripe test billing is not connected yet. The interface and database foundation are ready, but no one can be charged until test keys and the $49 advisor Stripe price ID are added.</Notice>}
    {params.error && <Notice tone="warning">Scout could not open billing. No charge was attempted.</Notice>}
    {billingResult.error && <Notice tone="warning">The subscription database update still needs to be applied before billing can begin.</Notice>}

    <section className="mt-7 grid gap-5 md:grid-cols-3">
      <Metric label="Agency subscription" value={statusLabel(billing?.status)} detail={billing?.cancel_at_period_end ? "Cancels at the end of the billing period" : active ? "Managed securely through Stripe" : "No active subscription"} />
      <Metric label="Advisor seats" value={String(advisors ?? 0)} detail="Members with the Advisor role" />
      <Metric label="Client access" value={`${clients ?? 0} free`} detail="Clients and portal links are never billed" />
    </section>

    <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.4fr_1fr]">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f6d78]">Planned pricing structure</p><h2 className="mt-2 text-2xl font-bold text-[#243c57]">Advisor seats only</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">The agency owner manages everyone under one organization. Only users assigned the Advisor role are billable seats. Owners, administrators, assistants, finance users, read-only users, and clients are excluded from billing.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><PlanLine label="Agency base" value="Free" /><PlanLine label="Each advisor" value="$49 / month" /><PlanLine label="Clients" value="Free" /><PlanLine label="Billing provider" value="Stripe" /></div>
        </div>
        <aside className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-amber-50 p-6"><h3 className="text-xl font-bold text-[#243c57]">{active ? "Manage subscription" : "Start subscription"}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{active ? "Update billing details, view invoices, or manage cancellation in Stripe's secure customer portal." : "When test prices are configured, Stripe Checkout will collect payment for each advisor seat securely."}</p>
          {active ? <div className="space-y-3"><form action="/api/billing/portal" method="post"><button disabled={!configured} className="mt-5 w-full rounded-xl bg-[#0f6d78] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Open billing portal</button></form><form action="/api/billing/sync-seats" method="post"><button disabled={!configured} className="w-full rounded-xl border border-[#0f6d78] bg-white px-5 py-3 font-bold text-[#0f6d78] disabled:cursor-not-allowed disabled:opacity-50">Update advisor seat count</button></form></div> : <form action="/api/billing/checkout" method="post"><button disabled={!configured || Boolean(billingResult.error) || (advisors ?? 0) === 0} className="mt-5 w-full rounded-xl bg-[#0f6d78] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Continue to secure checkout</button></form>}
          <p className="mt-3 text-xs leading-5 text-slate-500">Scout does not collect or store the agency&apos;s subscription card. Stripe handles it on a hosted page.</p>
        </aside>
      </div>
    </section>

    <section className="mt-7 grid gap-5 pb-10 md:grid-cols-3">
      <Definition title="No prices hard-coded" text="The displayed amount is $49 per advisor seat, while Stripe Price IDs still control the live checkout." />
      <Definition title="Stripe setup required" text="Create one recurring $49/month advisor seat price in Stripe, then put that Price ID into STRIPE_ADVISOR_PRICE_ID." />
      <Definition title="Agency-controlled" text="Only organization owners and administrators can begin checkout or open billing management." />
    </section>

    <section className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-[#243c57]">Recent billing activity</h2>
        <p className="mt-1 text-sm text-slate-600">Subscription invoices and payments mirrored from Stripe.</p>
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f6d78]">Invoices</h3>
          <div className="mt-4 space-y-3">
            {(invoicesResult.data ?? []).length ? (invoicesResult.data ?? []).map((invoice) => <div key={invoice.id} className="rounded-xl border border-slate-200 bg-[#f7faf9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#243c57]">{invoice.provider_invoice_id}</p>
                  <p className="mt-1 text-xs text-slate-500">{invoice.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : "No due date"} · {invoice.status.replaceAll("_", " ")}</p>
                </div>
                <p className="text-right text-sm font-semibold text-[#0f6d78]">{money(invoice.amount_paid, currency)} / {money(invoice.amount_due, currency)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Remaining: {money(invoice.amount_remaining, currency)}</p>
            </div>) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No invoices have synced yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f6d78]">Payments</h3>
          <div className="mt-4 space-y-3">
            {(paymentsResult.data ?? []).length ? (paymentsResult.data ?? []).map((payment) => <div key={payment.id} className="rounded-xl border border-slate-200 bg-[#f7faf9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#243c57]">{payment.provider_payment_id}</p>
                  <p className="mt-1 text-xs text-slate-500">Paid {new Date(payment.paid_at).toLocaleDateString()}</p>
                </div>
                <p className="text-right text-sm font-semibold text-emerald-700">{money(payment.amount, currency)}</p>
              </div>
            </div>) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No payment records have synced yet.</p>}
          </div>
        </div>
      </div>
    </section>

    <section className="mb-10 grid gap-5 md:grid-cols-2">
      <Definition
        title="How the app gets paid"
        text="Scout charges advisor seats through Stripe Checkout. To receive the money, connect your bank account in Stripe's Dashboard payout settings, then Stripe deposits your subscription revenue on its normal payout schedule."
      />
      <Definition
        title="If you later pay advisors"
        text="Use Stripe Connect for advisor payouts. Each advisor gets their own connected account, which keeps bank details out of Scout and lets Stripe handle onboarding and payout setup."
      />
    </section>
  </div></main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#243c57]">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>; }
function PlanLine({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-[#f7faf9] p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-bold text-[#243c57]">{value}</p></div>; }
function Definition({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-[#243c57]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>; }
function Notice({ tone, children }: { tone: "success" | "warning" | "neutral"; children: React.ReactNode }) { const classes = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"; return <p className={`mt-6 rounded-xl border p-4 font-semibold ${classes}`}>{children}</p>; }
function statusLabel(status: string | undefined) { if (!status || status === "not_started") return "Not started"; return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value); }
