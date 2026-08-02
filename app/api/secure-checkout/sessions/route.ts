import { z } from "zod";
import { createAuthorizedClient } from "@/lib/auth";
import { getSecureCheckoutProvider } from "@/lib/secure-checkout";
import { isApprovedSecureCheckoutUrl, sandboxCheckoutTarget } from "@/lib/secure-checkout-policy";

const requestSchema = z.object({
  credentialId: z.string().uuid(),
  clientId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_VGS_ENVIRONMENT !== "sandbox") {
    return Response.json({ error: "Secure checkout is not enabled" }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid checkout request" }, { status: 400 });
  if (!isApprovedSecureCheckoutUrl(sandboxCheckoutTarget.url)) {
    return Response.json({ error: "Supplier checkout is not approved" }, { status: 403 });
  }

  const supabase = await createAuthorizedClient();
  const [{ data: authData }, { data: credentialJson, error: credentialError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("get_proxy_payment_credential", { target_credential_id: parsed.data.credentialId }),
  ]);
  const credential = credentialJson as null | { id: string; organization_id: string; client_id: string; status: string };
  if (credentialError || !authData.user || !credential || credential.client_id !== parsed.data.clientId || credential.status !== "active") {
    return Response.json({ error: "Protected card is unavailable" }, { status: 404 });
  }

  const { data: session, error: sessionError } = await supabase.from("secure_checkout_sessions").insert({
    organization_id: credential.organization_id,
    client_id: credential.client_id,
    credential_id: credential.id,
    actor_user_id: authData.user.id,
    supplier: sandboxCheckoutTarget.supplier,
    target_url: sandboxCheckoutTarget.url,
    provider: "unassigned",
    status: "awaiting_provider",
    metadata: { environment: "sandbox", aliases_included: false },
  }).select("id").single();
  if (sessionError || !session) return Response.json({ error: "Scout could not create the secure checkout" }, { status: 400 });

  await supabase.from("audit_events").insert({
    organization_id: credential.organization_id,
    actor_user_id: authData.user.id,
    entity_type: "secure_checkout_session",
    entity_id: session.id,
    action: "created",
    metadata: { environment: "sandbox", supplier: sandboxCheckoutTarget.supplier },
  });

  const provider = await getSecureCheckoutProvider();
  if (provider) {
    try {
      const hosted = await provider.createSession({ checkoutSessionId: session.id, targetUrl: sandboxCheckoutTarget.url });
      const { error: updateError } = await supabase.from("secure_checkout_sessions").update({
        provider: "hosted_browser",
        provider_session_reference: hosted.providerReference,
        status: "ready",
        expires_at: hosted.expiresAt,
      }).eq("id", session.id);
      if (updateError) {
        await provider.releaseSession(hosted.providerReference).catch(() => undefined);
        return Response.json({ error: "Scout could not secure the hosted checkout" }, { status: 502 });
      }
    } catch (error) {
      console.error("Browserbase secure checkout failed", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown provider error",
      });
      await supabase.from("secure_checkout_sessions").update({ status: "failed", failure_code: "provider_start_failed" }).eq("id", session.id);
      return Response.json({ error: "The hosted Sandbox browser could not start" }, { status: 502 });
    }
  }
  return Response.json({
    sessionId: session.id,
    providerConnected: Boolean(provider),
    url: `/secure-checkout/${session.id}`,
  }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
}
