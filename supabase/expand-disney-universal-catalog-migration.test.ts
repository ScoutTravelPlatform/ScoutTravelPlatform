import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260820000100_expand_disney_universal_catalog.sql", import.meta.url),
  "utf8",
);

describe("expand Disney/Universal catalog migration", () => {
  it("adds a comprehensive set of real Walt Disney World resort hotels", () => {
    expect(migration).toContain("Disney''s Wilderness Lodge");
    expect(migration).toContain("Disney''s Riviera Resort");
    expect(migration).toContain("Disney''s Fort Wilderness Resort & Campground");
    expect(migration).toContain("Disney''s All-Star Movies Resort");
  });

  it("adds real Universal Orlando hotels beyond the original two", () => {
    expect(migration).toContain("Hard Rock Hotel");
    expect(migration).toContain("Loews Royal Pacific Resort");
    expect(migration).toContain("Universal''s Aventura Hotel");
  });

  it("gives room options to hotels that previously had none, not just new hotels", () => {
    // Disney's Contemporary Resort and Disney's Beach Club Resort existed
    // in the original seed but had zero room options before this migration.
    expect(migration).toContain("('Disney''s Contemporary Resort', 'Theme Park View Room')");
    expect(migration).toContain("('Disney''s Beach Club Resort', 'Standard View Room')");
    expect(migration).toContain("('Loews Portofino Bay Hotel', 'Standard Room')");
  });

  it("is idempotent and scoped to the correct supplier via a name-matched join, not hardcoded ids", () => {
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("on lower(p.name) = lower(v.property_name)");
    expect(migration).toContain("where p.supplier_id = disney_id");
    expect(migration).toContain("where p.supplier_id = universal_id");
  });
});
