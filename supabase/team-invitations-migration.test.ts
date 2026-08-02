import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(new URL("./migrations/20260724000400_team_invitations.sql", import.meta.url), "utf8");
describe("team invitation security", () => {
  it("stores a hash rather than the raw invitation token", () => { expect(sql).toContain("token_hash text not null unique"); expect(sql).toContain("extensions.digest(raw_token,'sha256')"); });
  it("requires the signed-in email and an unexpired invitation", () => { expect(sql).toContain("invitation.expires_at<=now()"); expect(sql).toContain("user_email<>invitation.email"); });
  it("removes direct table access", () => { expect(sql).toContain("revoke all on table public.team_invitations from anon, authenticated"); });
});
