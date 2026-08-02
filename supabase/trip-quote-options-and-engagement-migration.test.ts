import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260731020000_trip_quote_options_and_engagement.sql", import.meta.url),
  "utf8",
);

describe("trip quote options and engagement migration", () => {
  it("creates the option and engagement tables with organization inheritance", () => {
    expect(migration).toContain("create table public.trip_quote_options");
    expect(migration).toContain("create table public.trip_quote_views");
    expect(migration).toContain("create table public.trip_quote_option_interactions");
    expect(migration).toContain("inherit_trip_quote_option_organization");
    expect(migration).toContain("inherit_trip_quote_engagement_organization");
  });

  it("secures the new tables for organization members and working roles", () => {
    expect(migration).toContain("alter table public.trip_quote_options enable row level security");
    expect(migration).toContain("alter table public.trip_quote_views enable row level security");
    expect(migration).toContain("alter table public.trip_quote_option_interactions enable row level security");
    expect(migration).toContain("public.is_org_member(organization_id)");
    expect(migration).toContain("array['owner','admin','advisor','assistant']::public.app_role[]");
  });
});
