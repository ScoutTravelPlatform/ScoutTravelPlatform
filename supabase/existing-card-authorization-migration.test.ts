import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260817000100_existing_card_authorization.sql", import.meta.url),
  "utf8",
);

describe("existing card authorization migration", () => {
  it("validates the portal token the same way add_encrypted_payment_credential does", () => {
    expect(migration).toContain("token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')");
    expect(migration).toContain("l.revoked_at is null and l.expires_at > now()");
  });

  it("only authorizes an active credential that belongs to the portal's own client", () => {
    expect(migration).toContain("where c.id = target_credential_id and c.status = 'active'");
    expect(migration).toContain("if credential_client is null or credential_client <> portal_row.client_id then");
    expect(migration).toContain("raise exception 'card not available for this client'");
  });

  it("inserts an authorization and event row, and returns ids for the caller to notify with", () => {
    expect(migration).toContain("insert into public.payment_credential_authorizations (");
    expect(migration).toContain("'client_portal_existing_card'");
    expect(migration).toContain("returns table (authorization_id uuid, trip_id uuid, organization_id uuid)");
  });

  it("runs as security definer without exposing itself to the public role, granted anon since the portal has no session", () => {
    expect(migration).toContain("revoke all on function public.add_payment_credential_authorization(text, uuid, text, text, numeric, text) from public");
    expect(migration).toContain("grant execute on function public.add_payment_credential_authorization(text, uuid, text, text, numeric, text) to anon, authenticated");
  });

  it("extends get_client_portal with the client's existing cards, never the encrypted fields", () => {
    const paymentCredentialsBlock = migration.slice(migration.indexOf("'payment_credentials', coalesce(("), migration.indexOf("from public.payment_credentials p"));
    expect(paymentCredentialsBlock).toContain("'display_label', p.display_label");
    expect(paymentCredentialsBlock).not.toContain("encrypted_pan");
    expect(paymentCredentialsBlock).not.toContain("encrypted_cvc");
    expect(migration).toContain("where p.client_id = c.id and p.status = 'active'");
  });
});
