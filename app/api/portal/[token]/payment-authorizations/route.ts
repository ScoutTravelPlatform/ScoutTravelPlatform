import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { notifyAdvisorOfPaymentAuthorization } from "@/lib/payment-authorization-notifications";
import type { Database } from "@/lib/supabase/database.types";

const portalTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const requestSchema = z.object({
  credentialId: z.uuid(),
  supplier: z.string().trim().min(1).max(150),
  purpose: z.string().trim().min(1).max(500),
  maximumAmount: z.number().positive().max(10_000_000).nullable(),
  consent: z.literal(true),
});

// gen-types doesn't mark RPC args as nullable even when the SQL parameter
// genuinely accepts null, same as add_encrypted_payment_credential's route.
type AddPaymentCredentialAuthorizationArgs = Database["public"]["Functions"]["add_payment_credential_authorization"]["Args"];

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!portalTokenPattern.test(token)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the authorization details" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_payment_credential_authorization", {
    portal_token: token,
    target_credential_id: parsed.data.credentialId,
    supplier_name: parsed.data.supplier,
    authorization_purpose: parsed.data.purpose,
    authorized_maximum: parsed.data.maximumAmount,
    consent_terms_version: "encrypted-supplier-authorization-v1",
  } as AddPaymentCredentialAuthorizationArgs);
  const result = data?.[0];
  if (error || !result) return Response.json({ error: "Scout could not save that authorization" }, { status: 400 });

  await notifyAdvisorOfPaymentAuthorization({
    tripId: result.trip_id,
    organizationId: result.organization_id,
    supplier: parsed.data.supplier,
    purpose: parsed.data.purpose,
    maximumAmount: parsed.data.maximumAmount,
    authorizationId: result.authorization_id,
  });

  return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store, private" } });
}
