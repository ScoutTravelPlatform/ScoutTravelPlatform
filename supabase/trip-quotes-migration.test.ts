import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260730000100_trip_quotes.sql", import.meta.url),
  "utf8",
);

describe("trip quotes migration", () => {
  it("keeps every quote inside its trip organization", () => {
    expect(migration).toContain("inherit_quote_organization");
    expect(migration).toContain("select organization_id into new.organization_id");
    expect(migration).toContain("alter table public.trip_quotes enable row level security");
  });

  it("limits quote access to organization members and working roles", () => {
    expect(migration).toContain("public.is_org_member(organization_id)");
    expect(migration).toContain("array['owner','admin','advisor','assistant']");
    expect(migration).not.toContain("to anon");
  });

  it("constrains amounts and quote statuses", () => {
    expect(migration).toContain("total_amount >= 0");
    expect(migration).toContain("deposit_amount >= 0");
    expect(migration).toContain("'Draft', 'Sent', 'Accepted', 'Declined', 'Expired'");
  });
});
