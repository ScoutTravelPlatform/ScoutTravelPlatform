import { describe, expect, it } from "vitest";
import { isApprovedSecureCheckoutUrl } from "./secure-checkout-policy";

describe("secure checkout allowlist", () => {
  it("allows only the exact VGS Sandbox test endpoint", () => {
    expect(isApprovedSecureCheckoutUrl("https://echo.sandbox.verygoodvault.com/post")).toBe(true);
    expect(isApprovedSecureCheckoutUrl("https://echo.sandbox.verygoodvault.com/anything-else")).toBe(false);
    expect(isApprovedSecureCheckoutUrl("https://evil.example/post")).toBe(false);
    expect(isApprovedSecureCheckoutUrl("http://echo.sandbox.verygoodvault.com/post")).toBe(false);
  });
});
