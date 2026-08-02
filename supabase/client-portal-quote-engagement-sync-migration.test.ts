import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260731030000_client_portal_quote_engagement_sync.sql", import.meta.url),
  "utf8",
);

describe("client portal quote engagement sync migration", () => {
  it("scopes get_client_portal quote options to client-visible quotes on an active portal link", () => {
    expect(migration).toContain("q.client_visible = true");
    expect(migration).toContain("l.revoked_at is null");
    expect(migration).toContain("l.expires_at > now()");
    expect(migration).toContain("from public.trip_quote_options opt");
    expect(migration).toContain("where opt.quote_id = q.id");
  });

  it("ties recorded interactions and views to the portal trip and organization", () => {
    expect(migration).toContain("q.trip_id = portal_link.trip_id");
    expect(migration).toContain("q.organization_id = portal_link.organization_id");
    expect(migration).toContain("q.client_visible = true");
  });

  it("validates the option belongs to the target quote before recording an interaction", () => {
    expect(migration).toContain("o.quote_id = target_quote.id");
  });

  it("clamps recorded time-on-page to a sane bounded range", () => {
    expect(migration).toContain("greatest(0, least(coalesce(time_on_page_seconds, 0), 3600))");
  });

  it("runs functions as security definer without exposing execution to the public role", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.get_client_portal(text) from public");
    expect(migration).toContain("revoke all on function public.record_trip_quote_option_interaction(text, uuid, uuid, text) from public");
    expect(migration).toContain("revoke all on function public.record_trip_quote_view(text, uuid, integer) from public");
  });
});
