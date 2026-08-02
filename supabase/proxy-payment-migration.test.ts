import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260724000100_proxy_payment_credentials.sql", import.meta.url),
  "utf8",
);

describe("proxy payment credential migration", () => {
  it("stores only format-preserving VGS aliases and expires the CVC alias", () => {
    expect(migration).toContain("pan_reference !~ '^[0-9]{13,19}$'");
    expect(migration).toContain("volatile_cvc_reference !~ '^[0-9]{3,4}$'");
    expect(migration).toContain("now() + interval '55 minutes'");
    expect(migration).toContain("case when c.cvc_expires_at > now() then c.cvc_reference else null end");
  });

  it("limits proxy credential retrieval to payment-authorized advisor roles", () => {
    expect(migration).toContain("array['owner','admin','advisor']");
    expect(migration).toContain("grant execute on function public.get_proxy_payment_credential(uuid) to authenticated");
    expect(migration).not.toContain("grant execute on function public.get_proxy_payment_credential(uuid) to anon");
  });
});
