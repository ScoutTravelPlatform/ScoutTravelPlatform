import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260802000100_client_intake.sql", import.meta.url),
  "utf8",
);

describe("client intake migration", () => {
  it("creates the intake domain tables", () => {
    expect(migration).toContain("create table public.client_travelers");
    expect(migration).toContain("create table public.client_celebrations");
    expect(migration).toContain("create table public.client_loyalty_programs");
    expect(migration).toContain("create table public.client_intake_links");
  });

  it("inherits organization scoping from the client (or traveler) rather than trusting client input", () => {
    expect(migration).toContain("inherit_client_child_organization");
    expect(migration).toContain("inherit_traveler_child_organization");
    expect(migration).toContain("select organization_id into new.organization_id");
  });

  it("enables row level security on every new table", () => {
    expect(migration).toContain("alter table public.client_travelers enable row level security");
    expect(migration).toContain("alter table public.client_celebrations enable row level security");
    expect(migration).toContain("alter table public.client_loyalty_programs enable row level security");
    expect(migration).toContain("alter table public.client_intake_links enable row level security");
  });

  it("restricts passport-holding client_travelers to a tighter role tier than the standard baseline", () => {
    expect(migration).toContain(
      "create policy client_travelers_select on public.client_travelers for select to authenticated\n  using (public.has_org_role(organization_id, array['owner','admin','advisor']::public.app_role[]));",
    );
    expect(migration).not.toContain(
      "create policy client_travelers_select on public.client_travelers for select to authenticated\n  using (public.has_org_role(organization_id, array['owner','admin','advisor','assistant']::public.app_role[]));",
    );
  });

  it("validates the intake token the same way client_portal_links does before returning or mutating data", () => {
    expect(migration).toContain("token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')");
    expect(migration).toContain("l.revoked_at is null");
    expect(migration).toContain("l.expires_at > now()");
  });

  it("confirms a traveler or loyalty program belongs to the token's client before mutating it", () => {
    expect(migration).toContain("where id = traveler_id and client_id = intake_link.client_id");
    expect(migration).toContain("where lp.id = program_id and t.client_id = intake_link.client_id");
  });

  it("runs every RPC as security definer without exposing execution to the public role", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.get_client_intake_profile(text) from public");
    expect(migration).toContain("grant execute on function public.get_client_intake_profile(text) to anon, authenticated");
    expect(migration).toContain("revoke all on function public.upsert_client_intake_traveler");
    expect(migration).toContain("grant execute on function public.upsert_client_intake_traveler");
  });
});
