import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_CONTEXT = "scout-vgs-show-v1";
const FIVE_MINUTES_IN_SECONDS = 5 * 60;

type RevealClaims = {
  credentialId: string;
  actorUserId: string;
  aliasDigest: string;
  expiresAt: number;
};

function aliasDigest(alias: string) {
  return createHash("sha256").update(alias).digest("base64url");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`${TOKEN_CONTEXT}.${payload}`).digest("base64url");
}

export function createSecureCardRevealToken(
  input: { credentialId: string; actorUserId: string; alias: string },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const claims: RevealClaims = {
    credentialId: input.credentialId,
    actorUserId: input.actorUserId,
    aliasDigest: aliasDigest(input.alias),
    expiresAt: nowSeconds + FIVE_MINUTES_IN_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySecureCardRevealToken(
  token: string,
  alias: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(payload, secret);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<RevealClaims>;
    if (
      typeof claims.credentialId !== "string" ||
      typeof claims.actorUserId !== "string" ||
      typeof claims.aliasDigest !== "string" ||
      typeof claims.expiresAt !== "number" ||
      claims.expiresAt < nowSeconds ||
      claims.expiresAt > nowSeconds + FIVE_MINUTES_IN_SECONDS ||
      claims.aliasDigest !== aliasDigest(alias)
    ) return null;
    return claims as RevealClaims;
  } catch {
    return null;
  }
}

export function getSecureCardRevealSecret() {
  const secret = process.env.VGS_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("Missing required server environment variable: VGS_CLIENT_SECRET");
  return secret;
}
