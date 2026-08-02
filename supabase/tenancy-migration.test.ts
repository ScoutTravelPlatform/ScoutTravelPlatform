import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260723000200_tenancy_and_rls.sql", import.meta.url),
  "utf8"
);

const tenantTables = [
  "clients",
  "trips",
  "booking_tasks",
  "booking_payments",
  "booking_commissions",
  "booking_timeline_events",
];

describe("tenancy migration", () => {
  it.each(tenantTables)("enables RLS for %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it("does not use a broad FOR ALL business-data policy", () => {
    expect(migration).not.toMatch(/create policy .* on public\.(clients|trips|booking_) .* for all/i);
  });

  it("keeps destructive financial permissions role-restricted", () => {
    expect(migration).toContain("create policy payments_delete");
    expect(migration).toContain("create policy commissions_delete");
    expect(migration).toContain("array['owner','admin','finance']");
  });
});
