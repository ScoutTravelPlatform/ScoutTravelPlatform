import { describe, expect, it } from "vitest";
import { findVgsFieldAlias, findVgsFieldValue } from "./aliases";

describe("VGS alias response parsing", () => {
  it("reads field-keyed aliases", () => {
    expect(findVgsFieldAlias({ data: { "card-number": "4111119381251111" } }, "card-number"))
      .toBe("4111119381251111");
    expect(findVgsFieldAlias({ data: { "card-expiration": { value: "tok_sandbox_abc123" } } }, "card-expiration"))
      .toBe("tok_sandbox_abc123");
  });

  it("reads Vault API classifier responses", () => {
    const response = { data: [{ classifiers: ["card-number"], aliases: [{ alias: "4111119381251111" }] }] };
    expect(findVgsFieldAlias(response, "card-number")).toBe("4111119381251111");
  });

  it("reads proxy-ready CVC aliases and unprotected expiration values by field", () => {
    const response = {
      data: {
        "card-cvc": { value: "731" },
        "card-expiration": { value: "12/30" },
      },
    };
    expect(findVgsFieldAlias(response, "card-cvc")).toBe("731");
    expect(findVgsFieldValue(response, "card-expiration")).toBe("12/30");
  });

  it("reads JSON-encoded iframe callback payloads", () => {
    const response = JSON.stringify({
      data: JSON.stringify({
        "card-number": { value: "4111119381251111" },
        "card-expiration": { value: "tok_sandbox_exp123" },
      }),
    });
    expect(findVgsFieldAlias(response, "card-number")).toBe("4111119381251111");
    expect(findVgsFieldAlias(response, "card-expiration")).toBe("tok_sandbox_exp123");
  });

  it("never treats unassociated raw-looking data as an alias", () => {
    expect(findVgsFieldAlias({ data: [{ value: "4111111111111111" }] }, "card-number")).toBeNull();
    expect(findVgsFieldAlias({ data: { unrelated: "tok_sandbox_secret" } }, "card-expiration")).toBeNull();
  });
});
