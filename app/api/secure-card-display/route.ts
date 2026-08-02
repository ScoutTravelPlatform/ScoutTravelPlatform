import { z } from "zod";
import { getSecureCardRevealSecret, verifySecureCardRevealToken } from "@/lib/vgs/reveal-token";

const requestSchema = z.object({
  card_number: z.string().regex(/^(?:tok_sandbox_[A-Za-z0-9-]+|\d{13,19})$/),
});
const allowedOrigins = new Set([
  "https://js.verygoodvault.com",
  "https://js3.verygoodvault.com",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://js.verygoodvault.com",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store, private",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_VGS_ENVIRONMENT !== "sandbox") {
    return Response.json({ error: "Secure display is unavailable" }, { status: 403, headers: corsHeaders(request) });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!parsed.success || !token) {
    return Response.json({ error: "Invalid secure display request" }, { status: 400, headers: corsHeaders(request) });
  }

  const claims = verifySecureCardRevealToken(
    token,
    parsed.data.card_number,
    getSecureCardRevealSecret(),
  );
  if (!claims) {
    return Response.json({ error: "Secure display authorization expired" }, { status: 403, headers: corsHeaders(request) });
  }

  // VGS reveals this alias only after the authenticated response leaves Scout.
  return Response.json(
    { card_number: parsed.data.card_number },
    { headers: corsHeaders(request) },
  );
}
