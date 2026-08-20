import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260817000400_catalog_search_browse_all.sql", import.meta.url),
  "utf8",
);

describe("catalog search browse-all migration", () => {
  it("relaxes every catalog search RPC to treat an empty query as browse-all instead of no results", () => {
    const relaxedClause = "trim(query) = '' or";
    const functionCount = (migration.match(/create or replace function public\.search_/g) ?? []).length;
    const relaxedCount = (migration.match(new RegExp(relaxedClause.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    expect(functionCount).toBe(5);
    expect(relaxedCount).toBe(5);
  });

  it("still applies the ilike filter once a query is actually typed", () => {
    expect(migration).toContain("s.name ilike '%' || trim(query) || '%'");
    expect(migration).toContain("d.name ilike '%' || trim(query) || '%'");
    expect(migration).toContain("p.name ilike '%' || trim(query) || '%'");
    expect(migration).toContain("r.name ilike '%' || trim(query) || '%'");
  });

  it("keeps every RPC security definer and capped at 20 results", () => {
    expect((migration.match(/limit 20/g) ?? []).length).toBe(5);
    expect((migration.match(/security definer/g) ?? []).length).toBe(5);
  });
});
