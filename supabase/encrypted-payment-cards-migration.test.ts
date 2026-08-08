import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260804000100_encrypted_payment_cards.sql", import.meta.url),
  "utf8",
);

describe("encrypted payment cards migration", () => {
  it("adds encrypted card columns and widens the provider constraint", () => {
    expect(migration).toContain("add column encrypted_pan bytea");
    expect(migration).toContain("add column encrypted_cvc bytea");
    expect(migration).toContain("check (provider in ('vgs', 'scout_encrypted'))");
  });

  it("validates the portal token before storing an encrypted credential, same as the VGS-era RPC", () => {
    expect(migration).toContain("token_hash = extensions.digest(convert_to(portal_token, 'UTF8'), 'sha256')");
    expect(migration).toContain("l.revoked_at is null and l.expires_at > now()");
  });

  it("stores ciphertext, not plaintext, and keeps the CVC on a short expiry", () => {
    expect(migration).toContain("decode(pan_ciphertext_base64, 'base64')");
    expect(migration).toContain("decode(cvc_ciphertext_base64, 'base64')");
    expect(migration).toContain("now() + interval '55 minutes'");
  });

  it("returns encrypted fields to the advisor reveal RPC only for authorized org roles", () => {
    expect(migration).toContain("'encrypted_pan', case when c.encrypted_pan is not null then encode(c.encrypted_pan, 'base64') else null end");
    expect(migration).toContain("public.has_org_role(c.organization_id, array['owner','admin','advisor']::public.app_role[])");
  });

  it("runs both RPCs as security definer without exposing them to the public role", () => {
    expect(migration).toContain("revoke all on function public.add_encrypted_payment_credential");
    expect(migration).toContain("grant execute on function public.add_encrypted_payment_credential");
    expect(migration).toContain("revoke all on function public.get_proxy_payment_credential(uuid) from public");
  });
});
