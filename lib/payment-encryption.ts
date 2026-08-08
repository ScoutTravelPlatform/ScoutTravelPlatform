import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function getPaymentEncryptionKey(): Buffer {
  const value = process.env.PAYMENT_CARD_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("Missing required server environment variable: PAYMENT_CARD_ENCRYPTION_KEY");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("PAYMENT_CARD_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptCardField(raw: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptCardField(blob: Buffer, key: Buffer): string {
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
