import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { decryptCardField, encryptCardField } = await import("./payment-encryption");

describe("payment card field encryption", () => {
  it("round-trips a card number through encrypt and decrypt", () => {
    const key = randomBytes(32);
    const blob = encryptCardField("4111111111111111", key);
    expect(decryptCardField(blob, key)).toBe("4111111111111111");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const key = randomBytes(32);
    const first = encryptCardField("4111111111111111", key);
    const second = encryptCardField("4111111111111111", key);
    expect(first.equals(second)).toBe(false);
  });

  it("fails to decrypt with the wrong key", () => {
    const blob = encryptCardField("4111111111111111", randomBytes(32));
    expect(() => decryptCardField(blob, randomBytes(32))).toThrow();
  });

  it("fails to decrypt if the ciphertext is tampered with", () => {
    const key = randomBytes(32);
    const blob = encryptCardField("4111111111111111", key);
    blob[blob.length - 1] ^= 0xff;
    expect(() => decryptCardField(blob, key)).toThrow();
  });
});
