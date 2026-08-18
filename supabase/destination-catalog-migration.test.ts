import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260817000300_destination_catalog.sql", import.meta.url),
  "utf8",
);

describe("destination catalog migration", () => {
  it("creates the destinations table with the same shared, dedup-by-name posture as suppliers", () => {
    expect(migration).toContain("create table public.destinations");
    expect(migration).toContain("create unique index destinations_name_unique_idx on public.destinations (lower(trim(name)))");
    expect(migration).toContain("revoke all on table public.destinations from anon, authenticated");
  });

  it("adds a nullable destination_id to suppliers rather than requiring one", () => {
    expect(migration).toContain("alter table public.suppliers add column destination_id uuid references public.destinations(id)");
  });

  it("adds destination-scoped overloads of the supplier RPCs without touching the existing unscoped signatures", () => {
    expect(migration).toContain("create or replace function public.search_suppliers(destination_id uuid, query text)");
    expect(migration).toContain("create or replace function public.find_or_create_supplier(destination_id uuid, supplier_name text)");
    expect(migration).not.toContain("drop function");
  });

  it("qualifies the column vs parameter reference to avoid the destination_id name collision", () => {
    expect(migration).toContain("coalesce(suppliers.destination_id, find_or_create_supplier.destination_id)");
  });

  it("seeds the two Orlando destinations and links only the suppliers that map cleanly to one", () => {
    expect(migration).toContain("'Walt Disney World Resort'");
    expect(migration).toContain("'Universal Orlando Resort'");
    expect(migration).toContain("update public.suppliers set destination_id = wdw_id where lower(name) = lower('Disney Destinations')");
  });

  it("runs every RPC as security definer without exposing them to the public role", () => {
    expect(migration).toContain("revoke all on function public.search_destinations(text) from public");
    expect(migration).toContain("grant execute on function public.find_or_create_supplier(uuid, text) to authenticated");
  });
});
