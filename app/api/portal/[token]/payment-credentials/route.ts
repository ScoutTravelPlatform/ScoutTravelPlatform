import { z } from "zod";
import { encryptCardField, getPaymentEncryptionKey } from "@/lib/payment-encryption";
import { createClient } from "@/lib/supabase/server";
import { notifyAdvisorOfPaymentAuthorization } from "@/lib/payment-authorization-notifications";
import type { Database } from "@/lib/supabase/database.types";

const portalTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const requestSchema = z.object({
  cardNumber: z.string().regex(/^[0-9]{13,19}$/),
  cvc: z.string().regex(/^\d{3,4}$/),
  expirationMonth: z.number().int().min(1).max(12),
  expirationYear: z.number().int().min(new Date().getFullYear()).max(2200),
  brand: z.string().trim().max(50),
  lastFour: z.string().regex(/^\d{4}$/),
  label: z.string().trim().min(1).max(100),
  supplier: z.string().trim().min(1).max(150),
  purpose: z.string().trim().min(1).max(500),
  maximumAmount: z.number().positive().max(10_000_000).nullable(),
  consent: z.literal(true),
});

// gen-types doesn't mark RPC args as nullable even when the SQL parameter
// genuinely accepts null, so this cast documents that mismatch.
type AddEncryptedPaymentCredentialArgs = Database["public"]["Functions"]["add_encrypted_payment_credential"]["Args"];

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!portalTokenPattern.test(token)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the authorization details" }, { status: 400 });

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    limit_key: `portal-payment-credentials:${token}`,
    max_requests: 10,
    window_seconds: 3600,
  });
  if (!allowed) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const key = getPaymentEncryptionKey();
  const panCiphertext = encryptCardField(parsed.data.cardNumber, key).toString("base64");
  const cvcCiphertext = encryptCardField(parsed.data.cvc, key).toString("base64");

  const { data, error } = await supabase.rpc("add_encrypted_payment_credential", {
    portal_token: token,
    pan_ciphertext_base64: panCiphertext,
    cvc_ciphertext_base64: cvcCiphertext,
    card_expiration_month: parsed.data.expirationMonth,
    card_expiration_year: parsed.data.expirationYear,
    card_brand: parsed.data.brand,
    card_last_four: parsed.data.lastFour,
    label: parsed.data.label,
    supplier_name: parsed.data.supplier,
    authorization_purpose: parsed.data.purpose,
    authorized_maximum: parsed.data.maximumAmount,
    consent_terms_version: "encrypted-supplier-authorization-v1",
  } as AddEncryptedPaymentCredentialArgs);
  const result = data?.[0];
  if (error || !result) return Response.json({ error: "Scout could not save the protected card" }, { status: 400 });

  await notifyAdvisorOfPaymentAuthorization({
    tripId: result.trip_id,
    organizationId: result.organization_id,
    supplier: parsed.data.supplier,
    purpose: parsed.data.purpose,
    maximumAmount: parsed.data.maximumAmount,
    authorizationId: result.credential_id,
  });

  return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store, private" } });
}
