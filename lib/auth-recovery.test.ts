import { describe, expect, it } from "vitest";
import { getPasswordResetRedirect, getSafeRecoveryDestination } from "./auth-recovery";

describe("password recovery URLs", () => {
  it("builds a reset callback on the configured Scout site", () => {
    expect(getPasswordResetRedirect("https://beta.scoutadviser.com")).toBe(
      "https://beta.scoutadviser.com/auth/callback?next=%2Freset-password"
    );
  });

  it("rejects non-web application URLs", () => {
    expect(() => getPasswordResetRedirect("javascript:alert(1)")).toThrow();
  });

  it("only allows the password reset destination", () => {
    expect(getSafeRecoveryDestination("/reset-password")).toBe("/reset-password");
    expect(getSafeRecoveryDestination("https://example.com")).toBe("/");
    expect(getSafeRecoveryDestination("//example.com")).toBe("/");
  });
});
