import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("./migrations/20260730000500_ai_draft_audit.sql", import.meta.url),
  "utf8",
);

describe("AI draft audit migration", () => {
  it("stores metadata without prompts or message bodies", () => {
    expect(sql).toContain("ai_generation_events");
    expect(sql).toContain("model text");
    expect(sql).not.toMatch(/prompt text|subject text|body text|message_content/i);
  });

  it("allows operational roles and limits ordinary users to their own records", () => {
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("array['owner','admin','advisor','assistant']");
  });
});
