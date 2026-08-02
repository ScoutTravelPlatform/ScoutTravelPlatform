import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql=readFileSync(new URL("./migrations/20260724000500_email_deliveries.sql",import.meta.url),"utf8");
describe("email delivery audit",()=>{it("limits delivery records to organization administrators",()=>{expect(sql).toContain("array['owner','admin']");expect(sql).toContain("created_by=auth.uid()");});it("does not define columns for tokens or message bodies",()=>{expect(sql).not.toMatch(/invitation_token|html_body|text_body/);});});
