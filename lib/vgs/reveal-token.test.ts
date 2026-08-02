import { describe, expect, it } from "vitest";
import { createSecureCardRevealToken, verifySecureCardRevealToken } from "./reveal-token";

const input = {
  credentialId: "7f3966db-9808-4a46-a40d-3a030db453ca",
  actorUserId: "4b20c984-894a-4d49-9aa4-b803eb960a15",
  alias: "4111113812011111",
};

describe("secure card reveal tokens", () => {
  it("authorizes only the matching alias during its short lifetime", () => {
    const token = createSecureCardRevealToken(input, "test-secret", 1_000);
    expect(verifySecureCardRevealToken(token, input.alias, "test-secret", 1_200)?.credentialId).toBe(input.credentialId);
    expect(verifySecureCardRevealToken(token, "4000000000000000", "test-secret", 1_200)).toBeNull();
    expect(verifySecureCardRevealToken(token, input.alias, "test-secret", 1_301)).toBeNull();
  });

  it("rejects altered tokens", () => {
    const token = createSecureCardRevealToken(input, "test-secret", 1_000);
    expect(verifySecureCardRevealToken(`${token}x`, input.alias, "test-secret", 1_100)).toBeNull();
  });
});
