import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260817000200_add_encrypted_payment_credential_returns_trip.sql", import.meta.url),
  "utf8",
);

describe("add_encrypted_payment_credential returns trip migration", () => {
  it("drops the old bare-uuid signature before recreating it, since Postgres can't change return type via CREATE OR REPLACE", () => {
    expect(migration).toContain("drop function if exists public.add_encrypted_payment_credential(");
    expect(migration).toContain("returns table (credential_id uuid, trip_id uuid, organization_id uuid)");
  });

  it("still validates the portal token and card fields exactly as before", () => {
    expect(migration).toContain("token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')");
    expect(migration).toContain("if card_last_four !~ '^[0-9]{4}$' then raise exception 'invalid last four'");
  });

  it("returns the new credential alongside trip/organization ids for the notification flow", () => {
    expect(migration).toContain("return query select new_credential_id, portal_row.trip_id, portal_row.organization_id");
  });

  it("stays granted to anon since the client portal has no session", () => {
    expect(migration).toContain("grant execute on function public.add_encrypted_payment_credential(");
    expect(migration).toContain(") to anon, authenticated;");
  });
});
