import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./migrations/20260723000700_payment_vault_foundation.sql", import.meta.url),
  "utf8",
);

describe("payment vault foundation", () => {
  it("stores provider references and masked metadata, not raw card fields", () => {
    expect(migration).toContain("provider_reference text not null");
    expect(migration).toContain("last_four text");
    expect(migration).not.toMatch(/\b(card_number|pan|cvv|cvc|gift_card_number|pin)\s+(text|varchar)/i);
  });

  it("limits credential access and makes usage events append-only", () => {
    expect(migration).toContain("array['owner','admin','advisor']");
    expect(migration).toContain("revoke update, delete on public.payment_credential_events");
    expect(migration).not.toContain("'assistant'::public.app_role");
  });

  it("checks credential, trip, client and organization relationships", () => {
    expect(migration).toContain("validate_payment_credential_tenant");
    expect(migration).toContain("validate_payment_authorization_tenant");
    expect(migration).toContain("credential_client <> trip_client");
  });
});
