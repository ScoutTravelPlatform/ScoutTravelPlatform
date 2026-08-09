import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260809000100_organization_join_requests.sql", import.meta.url),
  "utf8",
);

describe("organization join requests migration", () => {
  it("creates the join request table with no direct grants, matching the team_invitations pattern", () => {
    expect(migration).toContain("create table public.organization_join_requests");
    expect(migration).toContain("unique (organization_id, requester_user_id)");
    expect(migration).toContain("revoke all on table public.organization_join_requests from anon, authenticated");
  });

  it("blocks requesting a join if the user already belongs to an organization", () => {
    expect(migration).toContain("if exists (select 1 from public.organization_memberships where user_id = auth.uid()) then");
    expect(migration).toContain("raise exception 'already a member of an organization'");
  });

  it("only lets owners/admins list, approve, or deny pending requests", () => {
    expect(migration).toContain("public.has_org_role(target_organization_id, array['owner','admin']::public.app_role[])");
    expect(migration).toContain("if request.id is null or not public.has_org_role(request.organization_id, array['owner','admin']::public.app_role[]) then");
  });

  it("approving a request inserts the membership with the approver's chosen role, marks it approved, and returns the organization id", () => {
    expect(migration).toContain("insert into public.organization_memberships(organization_id, user_id, role)");
    expect(migration).toContain("values (request.organization_id, request.requester_user_id, assign_role)");
    expect(migration).toContain("update public.organization_join_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = request.id");
    expect(migration).toContain("returns uuid language plpgsql security definer set search_path = '' as $$\ndeclare request public.organization_join_requests%rowtype;");
    expect(migration).toContain("return request.organization_id;");
  });

  it("runs every RPC as security definer without exposing them to the public role", () => {
    expect(migration).toContain("revoke all on function public.search_organizations(text) from public");
    expect(migration).toContain("grant execute on function public.approve_organization_join_request(uuid, public.app_role) to authenticated");
    expect(migration).toContain("grant execute on function public.deny_organization_join_request(uuid) to authenticated");
  });
});
