import Link from "next/link";
import { createAuthorizedClient } from "@/lib/auth";
import { buildAgencyYearReport, normalizeReportYear } from "@/lib/agency-report";

type Props = { searchParams: Promise<{ year?: string | string[] }> };

const agencyReportRoles = new Set(["owner", "admin", "finance"]);

export default async function ReportsPage({ searchParams }: Props) {
  const supabase = await createAuthorizedClient();
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  if (!agencyReportRoles.has(membership.role)) {
    return <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Agency reporting</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#243c57]">Financial reports are limited</h1>
        <p className="mt-3 leading-7 text-slate-600">Owners, administrators, and finance team members can review agency-wide sales and commission reporting.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[#0f6d78] px-5 py-3 font-bold text-white">Return to dashboard</Link>
      </div>
    </main>;
  }

  const currentYear = new Date().getFullYear();
  const year = normalizeReportYear((await searchParams).year, currentYear);
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;
  const [{ data: organization }, { data: team }, tripsResult, paymentsResult, commissionsResult] = await Promise.all([
    supabase.from("organizations").select("name, currency").eq("id", membership.organization_id).maybeSingle(),
    supabase.rpc("get_organization_team", { target_organization_id: membership.organization_id }),
    supabase.from("trips").select("id, assigned_advisor_id, start_date, status, package_price").gte("start_date", yearStart).lt("start_date", nextYearStart),
    supabase.from("booking_payments").select("trip_id, amount, paid"),
    supabase.from("booking_commissions").select("trip_id, expected_commission, commission_received"),
  ]);

  const hasError = Boolean(tripsResult.error || paymentsResult.error || commissionsResult.error);
  const report = buildAgencyYearReport({
    year,
    advisors: (team ?? []).map((member) => ({
      userId: member.user_id,
      name: member.full_name || member.email || "Team member",
      role: member.role,
    })),
    trips: (tripsResult.data ?? [])
      .filter((trip): trip is typeof trip & { start_date: string } => trip.start_date !== null),
    payments: (paymentsResult.data ?? []).map((payment) => ({ ...payment, amount: payment.amount ?? 0 })),
    commissions: commissionsResult.data ?? [],
  });
  const years = Array.from({ length: 5 }, (_, index) => currentYear + 1 - index);
  const currency = organization?.currency ?? "USD";
  const outstanding = report.totals.clientPaymentsDue + report.totals.commissionDue;
  const collectionRate = report.totals.clientPaymentsScheduled > 0
    ? Math.round((report.totals.clientPaymentsCollected / report.totals.clientPaymentsScheduled) * 100)
    : 0;
  const commissionCollectionRate = report.totals.commissionExpected > 0
    ? Math.round((report.totals.commissionReceived / report.totals.commissionExpected) * 100)
    : 0;
  const topAdvisor = report.rows[0];

  return <main className="min-h-screen bg-[#f6f8f7] p-5 text-slate-900 md:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Agency performance</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-[#243c57]">Annual financial report</h1>
          <p className="mt-2 max-w-3xl text-slate-600">Track every advisor&apos;s departing trips, booked sales, scheduled client payments, and commissions for the year.</p>
        </div>
        <form className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label htmlFor="report-year" className="text-sm font-semibold text-slate-600">Travel year</label>
          <select id="report-year" name="year" defaultValue={String(year)} className="rounded-lg border border-slate-300 bg-[#f6f8f7] px-4 py-2 font-semibold" autoComplete="off">
            {years.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button className="rounded-lg bg-[#0f6d78] px-4 py-2 font-bold text-white">View</button>
        </form>
      </header>

      {hasError && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Some financial records could not be loaded. Refresh before relying on these totals.</p>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Trips departing" value={String(report.totals.tripCount)} detail={`${organization?.name ?? "Agency"} · ${year}`} />
        <Metric label="Booked sales" value={money(report.totals.bookedSales, currency)} detail="Package value, excluding cancelled trips" />
        <Metric label="Client payments due" value={money(report.totals.clientPaymentsDue, currency)} detail={`${money(report.totals.clientPaymentsCollected, currency)} collected`} />
        <Metric label="Commission due" value={money(report.totals.commissionDue, currency)} detail={`${money(report.totals.commissionReceived, currency)} received`} />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Outstanding across the agency"
          value={money(outstanding, currency)}
          detail={`${money(report.totals.clientPaymentsDue, currency)} client balances + ${money(report.totals.commissionDue, currency)} commissions`}
        />
        <SummaryCard
          title="Client collection rate"
          value={`${collectionRate}%`}
          detail={`${money(report.totals.clientPaymentsCollected, currency)} collected of ${money(report.totals.clientPaymentsScheduled, currency)} scheduled`}
        />
        <SummaryCard
          title="Commission collection rate"
          value={`${commissionCollectionRate}%`}
          detail={`${money(report.totals.commissionReceived, currency)} received of ${money(report.totals.commissionExpected, currency)} expected`}
        />
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <Definition
          title="Top producing advisor"
          text={topAdvisor ? `${topAdvisor.advisorName} leads with ${topAdvisor.tripCount} trips and ${money(topAdvisor.bookedSales, currency)} in booked sales this year.` : `No advisor data is available yet for ${year}.`}
        />
        <Definition
          title="How to read this report"
          text="Booked sales are trip package totals, client payments show what has been scheduled and collected, and commission due reflects what suppliers still owe the agency."
        />
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-[#243c57]">Advisor performance</h2>
          <p className="mt-1 text-sm text-slate-600">Trips are credited to the advisor assigned on the trip record.</p>
        </div>
        {report.rows.length ? <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#f7faf9] text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-6 py-4">Advisor</th><th className="px-4 py-4 text-right">Trips</th><th className="px-4 py-4 text-right">Booked sales</th><th className="px-4 py-4 text-right">Payments collected</th><th className="px-4 py-4 text-right">Payments due</th><th className="px-4 py-4 text-right">Commission expected</th><th className="px-6 py-4 text-right">Commission due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">{report.rows.map((row) => <tr key={row.key} className="hover:bg-sky-50/50">
              <td className="px-6 py-5"><p className="font-bold text-[#243c57]">{row.advisorName}</p><p className="mt-1 text-xs capitalize text-slate-500">{row.role?.replace("_", " ") ?? "Needs assignment"}</p></td>
              <td className="px-4 py-5 text-right font-semibold">{row.tripCount}</td>
              <td className="px-4 py-5 text-right font-semibold">{money(row.bookedSales, currency)}</td>
              <td className="px-4 py-5 text-right text-emerald-700">{money(row.clientPaymentsCollected, currency)}</td>
              <td className="px-4 py-5 text-right text-amber-700">{money(row.clientPaymentsDue, currency)}</td>
              <td className="px-4 py-5 text-right">{money(row.commissionExpected, currency)}</td>
              <td className="px-6 py-5 text-right font-bold text-[#0f6d78]">{money(row.commissionDue, currency)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="p-10 text-center"><p className="font-semibold">No departing trips in {year}.</p><p className="mt-2 text-sm text-slate-600">Trips will appear here as they are added and assigned.</p></div>}
      </section>

      <section className="mt-7 grid gap-5 pb-10 lg:grid-cols-3">
        <Definition title="Booked sales" text="The package price for non-cancelled trips departing during the selected year. This is sales volume, not agency income." />
        <Definition title="Client payments" text="Amounts recorded in each trip's payment schedule. Collected and due figures depend on advisors marking payments accurately." />
        <Definition title="Commission" text="Expected and received amounts from commission records. Commission due never falls below zero if a supplier overpays." />
      </section>
    </div>
  </main>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#243c57]">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-amber-50 p-5 shadow-sm"><p className="text-sm font-semibold text-sky-800">{title}</p><p className="mt-2 text-2xl font-bold text-[#243c57]">{value}</p><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></div>;
}

function Definition({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-[#243c57]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}
