import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("./migrations/20260730000400_communications.sql", import.meta.url),
  "utf8",
);

describe("communications migration", () => {
  it("keeps drafts inside the trip organization", () => {
    expect(sql).toContain("inherit_communication_organization");
    expect(sql).toContain("new.organization_id = source_organization_id");
    expect(sql).toContain("new.client_id = source_client_id");
  });

  it("requires advisor review before scheduled delivery", () => {
    expect(sql).toContain("'draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled'");
    expect(sql).toContain("status <> 'scheduled' or scheduled_for is not null");
  });

  it("tracks explicit SMS consent separately from the phone number", () => {
    expect(sql).toContain("sms_consent_status");
    expect(sql).toContain("'not_asked', 'opted_in', 'opted_out'");
  });

  it("does not create storage for payment credentials", () => {
    expect(sql).not.toMatch(/\b(card_number|pan|cvc|cvv|vgs_alias)\b/i);
  });

  it("limits write access to operational roles", () => {
    expect(sql).toContain("array['owner','admin','advisor','assistant']");
    expect(sql).toContain("created_by = auth.uid()");
  });
});
