import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260802020000_client_invite_links.sql", import.meta.url),
  "utf8",
);

describe("client invite links migration", () => {
  it("makes client_id optional and adds the pending-contact columns", () => {
    expect(migration).toContain("alter table public.client_intake_links alter column client_id drop not null");
    expect(migration).toContain("add column invited_email text");
    expect(migration).toContain("add column invited_phone_e164 text");
  });

  it("requires at least one of client_id, invited_email, or invited_phone_e164", () => {
    expect(migration).toContain(
      "check (client_id is not null or invited_email is not null or invited_phone_e164 is not null)",
    );
  });

  it("lets the org-inherit trigger accept a direct organization_id when there is no client yet", () => {
    expect(migration).toContain("if new.client_id is not null then");
    expect(migration).toContain("elsif new.organization_id is null then");
    expect(migration).toContain("raise exception 'organization is required when no client is specified'");
  });

  it("returns a blank pre-filled profile from get_client_intake_profile when the link is unclaimed", () => {
    expect(migration).toContain("when l.client_id is null then jsonb_build_object(");
    expect(migration).toContain("'email', coalesce(l.invited_email, '')");
    expect(migration).toContain("'phone_e164', l.invited_phone_e164");
  });

  it("creates the client and claims the link on first contact submission, preserving the ambiguity-fix pragma", () => {
    expect(migration).toContain(
      "drop function if exists public.submit_client_intake_contact(text, text, text, text, text, text, text, text, text, text)",
    );
    expect(migration).toContain("insert into public.clients (");
    expect(migration).toContain("update public.client_intake_links set client_id = new_client_id where id = intake_link.id");
    expect(migration.match(/#variable_conflict use_variable/g)?.length).toBe(5);
  });

  it("blocks travelers, celebrations, preferences, and loyalty programs until contact info is submitted", () => {
    const guardCount = migration.match(/raise exception 'complete your contact information first'/g)?.length ?? 0;
    expect(guardCount).toBe(4);
  });
});
