import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260809100000_supplier_catalog.sql", import.meta.url),
  "utf8",
);

describe("supplier catalog migration", () => {
  it("creates the three catalog tables with no organization_id column, unlike every other table in this schema", () => {
    expect(migration).toContain("create table public.suppliers");
    expect(migration).toContain("create table public.supplier_properties");
    expect(migration).toContain("create table public.supplier_room_options");
    expect(migration).not.toContain("organization_id uuid");
  });

  it("dedupes case-insensitively via a unique index on lower(trim(name))", () => {
    expect(migration).toContain("create unique index suppliers_name_unique_idx on public.suppliers (lower(trim(name)))");
    expect(migration).toContain("create unique index supplier_properties_name_unique_idx on public.supplier_properties (supplier_id, lower(trim(name)))");
    expect(migration).toContain("create unique index supplier_room_options_name_unique_idx on public.supplier_room_options (property_id, lower(trim(name)))");
  });

  it("is readable and insertable by every authenticated user, with no update/delete policy", () => {
    expect(migration).toContain("create policy suppliers_select on public.suppliers for select to authenticated using (true)");
    expect(migration).toContain("create policy suppliers_insert on public.suppliers for insert to authenticated with check (true)");
    expect(migration).not.toContain("for update");
    expect(migration).not.toContain("for delete");
  });

  it("find_or_create RPCs look up case-insensitively before inserting, to avoid duplicate catalog entries", () => {
    expect(migration).toContain("select s.id into existing_id from public.suppliers s where lower(s.name) = lower(clean_name)");
    expect(migration).toContain("insert into public.suppliers(name, created_by) values (clean_name, auth.uid()) returning suppliers.id into new_id");
  });

  it("adds the new room_option column to trips and trip_quote_options as plain nullable text", () => {
    expect(migration).toContain("alter table public.trips add column room_option text");
    expect(migration).toContain("alter table public.trip_quote_options add column room_option text");
  });

  it("seeds a starter set of real suppliers and properties", () => {
    expect(migration).toContain("Disney Destinations");
    expect(migration).toContain("Disney''s Grand Floridian Resort & Spa");
    expect(migration).toContain("Theme Park View Room");
  });

  it("runs every RPC as security definer without exposing them to the public role", () => {
    expect(migration).toContain("revoke all on function public.find_or_create_supplier(text) from public");
    expect(migration).toContain("grant execute on function public.search_suppliers(text) to authenticated");
    expect(migration).toContain("grant execute on function public.find_or_create_supplier_room_option(uuid, text) to authenticated");
  });
});
