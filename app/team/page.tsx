import { createAuthorizedClient } from "@/lib/auth";
import { isEmailDeliveryConfigured } from "@/lib/email";
import TeamRoleControl from "./TeamRoleControl";
import TeamInviteManager from "./TeamInviteManager";
import OrganizationJoinRequestManager from "./OrganizationJoinRequestManager";

const roleDescriptions = [
  ["Owner", "Full control, including ownership and team roles."],
  ["Admin", "Manages operations and non-owner team roles."],
  ["Advisor", "Manages clients, trips, timelines, and protected payment workflows."],
  ["Assistant", "Supports clients, trips, tasks, timelines, and itineraries."],
  ["Finance", "Manages payments and commissions."],
  ["Read only", "Can review organization records without changing them."],
] as const;

export default async function TeamPage() {
  const supabase = await createAuthorizedClient();
  const { data: authData } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id, role").limit(1).maybeSingle();
  if (!membership) return null;
  const [{ data: organization }, { data: team, error }, { data: invitations }, { data: joinRequests }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", membership.organization_id).maybeSingle(),
    supabase.rpc("get_organization_team", { target_organization_id: membership.organization_id }),
    supabase.rpc("list_team_invitations", { target_organization_id: membership.organization_id }),
    supabase.rpc("list_organization_join_requests", { target_organization_id: membership.organization_id }),
  ]);
  const canManage = membership.role === "owner" || membership.role === "admin";
  const emailDeliveryConfigured = isEmailDeliveryConfigured();

  return <main className="min-h-screen bg-[#f6f8f7] p-6 text-slate-900 md:p-8"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-200 pb-7"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Organization settings</p><h1 className="mt-2 text-3xl font-bold">{organization?.name ?? "Scout"} team</h1><p className="mt-2 text-slate-600">Review who can access the organization and what each role is allowed to manage.</p></header>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-bold">Team members</h2><p className="mt-1 text-sm text-slate-600">Role changes are audited. Scout will never allow the last owner to be removed.</p></div>
      {error ? <p className="p-6 text-amber-800">Team management is waiting for its database update.</p> : <div className="divide-y divide-slate-200">{(team ?? []).map((member) => <article key={member.membership_id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold">{member.full_name || member.email || "Team member"}{member.user_id === authData.user?.id && <span className="ml-2 text-xs font-semibold text-sky-700">You</span>}</h3><p className="mt-1 text-sm text-slate-600">{member.email}</p><p className="mt-2 text-xs text-slate-500">Joined {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div><TeamRoleControl membershipId={member.membership_id} initialRole={member.role} canManage={canManage} /></article>)}</div>}
    </section>
    {canManage && <TeamInviteManager organizationId={membership.organization_id} invitations={invitations ?? []} emailDeliveryConfigured={emailDeliveryConfigured} />}
    {canManage && <OrganizationJoinRequestManager requests={joinRequests ?? []} />}
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Role guide</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{roleDescriptions.map(([role, description]) => <div key={role} className="rounded-xl border border-slate-200 bg-[#f6f8f7] p-4"><h3 className="font-bold">{role}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>)}</div><p className="mt-5 text-sm text-slate-500">Secure card and hosted checkout access remains limited to owners, admins, and advisors.</p></section>
  </div></main>;
}
