import "server-only";

type VgsServerEnv = {
  clientId: string;
  clientSecret: string;
  environment: "sandbox";
};

function requireServerEnv(name: "VGS_CLIENT_ID" | "VGS_CLIENT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

export function getVgsServerEnv(): VgsServerEnv {
  if (process.env.NEXT_PUBLIC_VGS_ENVIRONMENT !== "sandbox") {
    throw new Error("VGS Collect is restricted to the sandbox environment");
  }
  return {
    clientId: requireServerEnv("VGS_CLIENT_ID"),
    clientSecret: requireServerEnv("VGS_CLIENT_SECRET"),
    environment: "sandbox",
  };
}

export async function createVgsCollectAccessToken() {
  const { clientId, clientSecret } = getVgsServerEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(
    "https://auth.verygoodsecurity.com/auth/realms/vgs/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("VGS authentication failed");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("access_token" in data) || typeof data.access_token !== "string") {
    throw new Error("VGS returned an invalid authentication response");
  }
  return data.access_token;
}

