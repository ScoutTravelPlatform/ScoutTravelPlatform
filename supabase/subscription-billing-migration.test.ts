import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("./migrations/20260730000300_subscription_billing.sql", import.meta.url),
  "utf8",
);

describe("subscription billing migration", () => {
  it("stores only Stripe references and limits billing access", () => {
    expect(migration).toContain("create table public.organization_billing");
    expect(migration).toContain("advisor_seat_quantity");
    expect(migration).toContain("array['owner','admin']");
    expect(migration).toContain("Never store payment method or card data here");
    expect(migration).not.toMatch(/card_number|\bpan\b|\bcvc\b/i);
  });
});
