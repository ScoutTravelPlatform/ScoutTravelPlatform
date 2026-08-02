import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const portalTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const requestSchema = z.object({
  panReference: z.string().regex(/^(tok_sandbox_[A-Za-z0-9]+|[0-9]{13,19})$/),
  expirationMonth: z.number().int().min(1).max(12),
  expirationYear: z.number().int().min(new Date().getFullYear()).max(2200),
  cvcReference: z.string().regex(/^\d{3,4}$/),
  brand: z.string().trim().max(50),
  lastFour: z.string().regex(/^\d{4}$/),
  label: z.string().trim().min(1).max(100),
  supplier: z.string().trim().min(1).max(150),
  purpose: z.string().trim().min(1).max(500),
  maximumAmount: z.number().positive().max(10_000_000).nullable(),
  consent: z.literal(true),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (process.env.NEXT_PUBLIC_VGS_ENVIRONMENT !== "sandbox") {
    return Response.json({ error: "Payment collection is not enabled" }, { status: 403 });
  }
  const { token } = await context.params;
  if (!portalTokenPattern.test(token)) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the authorization details" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_client_portal_payment_credential", {
    portal_token: token,
    pan_reference: parsed.data.panReference,
    card_expiration_month: parsed.data.expirationMonth,
    card_expiration_year: parsed.data.expirationYear,
    volatile_cvc_reference: parsed.data.cvcReference,
    card_brand: parsed.data.brand,
    card_last_four: parsed.data.lastFour,
    label: parsed.data.label,
    supplier_name: parsed.data.supplier,
    authorization_purpose: parsed.data.purpose,
    // authorized_maximum is a nullable numeric SQL param (uncapped authorization when
    // omitted) — gen-types doesn't mark RPC args as nullable, so this cast is safe.
    authorized_maximum: parsed.data.maximumAmount as number,
    consent_terms_version: "sandbox-supplier-authorization-v1",
  });
  if (error) return Response.json({ error: "Scout could not save the protected card" }, { status: 400 });
  return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store, private" } });
}
