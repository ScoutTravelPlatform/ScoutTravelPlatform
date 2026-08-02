import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260802010000_client_intake_rpc_ambiguity_fix.sql", import.meta.url),
  "utf8",
);

describe("client intake RPC ambiguity fix migration", () => {
  it("replaces every write RPC whose parameter names shadowed the columns they write", () => {
    expect(migration).toContain("create or replace function public.submit_client_intake_contact(");
    expect(migration).toContain("create or replace function public.submit_client_intake_preferences(");
    expect(migration).toContain("create or replace function public.upsert_client_intake_traveler(");
    expect(migration).toContain("create or replace function public.upsert_client_intake_celebration(");
    expect(migration).toContain("create or replace function public.upsert_client_intake_loyalty_program(");
  });

  it("resolves the parameter/column name collision in favor of the parameter everywhere it appears", () => {
    const occurrences = migration.match(/#variable_conflict use_variable/g) ?? [];
    expect(occurrences.length).toBe(5);
  });

  it("falls back to the existing column value (not the blank parameter) when a trimmed name is empty", () => {
    expect(migration).toContain("coalesce(nullif(trim(first_name), ''), public.clients.first_name)");
    expect(migration).toContain("coalesce(nullif(trim(last_name), ''), public.clients.last_name)");
  });

  it("still validates the intake token before mutating data", () => {
    expect(migration).toContain("token_hash = extensions.digest(convert_to(intake_token, 'UTF8'), 'sha256')");
    expect(migration).toContain("l.revoked_at is null");
    expect(migration).toContain("l.expires_at > now()");
  });
});
