import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260820000200_portal_rate_limiting.sql", import.meta.url),
  "utf8",
);

describe("portal rate limiting migration", () => {
  it("creates a counters table with row level security and no policies", () => {
    expect(migration).toContain("create table if not exists public.rate_limit_counters");
    expect(migration).toContain("alter table public.rate_limit_counters enable row level security");
    expect(migration).not.toMatch(/create policy/i);
  });

  it("exposes an atomic, security-definer check_rate_limit function grantable to anon", () => {
    expect(migration).toContain("create or replace function public.check_rate_limit(limit_key text, max_requests integer, window_seconds integer)");
    expect(migration).toContain("security definer");
    expect(migration).toContain("grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated");
  });

  it("resets the window instead of only ever incrementing", () => {
    expect(migration).toContain("then 1");
    expect(migration).toContain("rate_limit_counters.request_count + 1");
  });
});
