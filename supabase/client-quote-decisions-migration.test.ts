import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260730000200_client_quote_decisions.sql", import.meta.url),
  "utf8",
);

describe("client quote decisions migration", () => {
  it("only exposes explicitly client-visible quotes through an active portal", () => {
    expect(migration).toContain("q.client_visible = true");
    expect(migration).toContain("l.revoked_at is null");
    expect(migration).toContain("l.expires_at > now()");
  });

  it("ties quote responses to the portal trip and organization", () => {
    expect(migration).toContain("q.trip_id = portal_link.trip_id");
    expect(migration).toContain("q.organization_id = portal_link.organization_id");
    expect(migration).toContain("q.client_visible = true");
  });

  it("records client decisions without storing the portal token", () => {
    expect(migration).toContain("client_quote_accepted");
    expect(migration).toContain("client_quote_declined");
    expect(migration).not.toContain("jsonb_build_object('portal_token'");
  });
});
