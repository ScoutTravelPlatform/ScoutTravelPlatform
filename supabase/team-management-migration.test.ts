import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("./migrations/20260724000300_team_management.sql", import.meta.url), "utf8");

describe("team management migration", () => {
  it("keeps the directory tenant-scoped and authenticated", () => {
    expect(sql).toContain("public.is_org_member(target_organization_id)");
    expect(sql).toContain("grant execute on function public.get_organization_team(uuid) to authenticated");
  });

  it("guards owner changes and records an audit event", () => {
    expect(sql).toContain("organization must retain an owner");
    expect(sql).toContain("insufficient team permissions");
    expect(sql).toContain("'role_updated'");
  });
});
