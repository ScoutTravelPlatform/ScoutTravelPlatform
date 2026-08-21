import { createAdminClient } from "@/lib/supabase/admin";

// Unconditional sweep for CVC data past its retention window, independent of
// whether an advisor ever looks the credential up again (get_proxy_payment_credential
// only purges opportunistically, on read). Card-network rules prohibit
// retaining CVV/CVC after authorization, so this must run on a schedule, not
// only in response to access. Triggered daily by Vercel Cron (see
// vercel.json — Vercel's Hobby plan only allows one run per day; the
// opportunistic purge on read still covers the common case immediately),
// which sends this bearer token automatically once CRON_SECRET is set.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return Response.json({ error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_credentials")
    .update({ encrypted_cvc: null, cvc_reference: null })
    .lte("cvc_expires_at", new Date().toISOString())
    .or("encrypted_cvc.not.is.null,cvc_reference.not.is.null")
    .select("id");

  if (error) return Response.json({ error: "Purge failed" }, { status: 500 });

  // Rate-limit counters (see check_rate_limit RPC) are windowed and stale
  // ones serve no purpose after their window has long since passed — swept
  // here rather than adding a second cron, since Vercel's Hobby plan only
  // allows daily schedules.
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await admin.from("rate_limit_counters").delete().lt("window_start", staleCutoff);

  return Response.json({ purged: data?.length ?? 0 });
}
