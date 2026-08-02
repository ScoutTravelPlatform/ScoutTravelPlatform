import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const portalTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const requestSchema = z.object({
  quoteIds: z.array(z.uuid()).min(1).max(20),
  timeOnPageSeconds: z.number().int().nonnegative().max(3600),
});

// Called via navigator.sendBeacon on pagehide, so it must accept the beacon's
// default Content-Type (text/plain) instead of requiring application/json.
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!portalTokenPattern.test(token)) return new Response(null, { status: 404 });
  const body = await request.text();
  const parsed = requestSchema.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) return new Response(null, { status: 400 });

  const supabase = await createClient();
  await Promise.all(parsed.data.quoteIds.map((quoteId) =>
    supabase.rpc("record_trip_quote_view", {
      portal_token: token,
      target_quote_id: quoteId,
      time_on_page_seconds: parsed.data.timeOnPageSeconds,
    })
  ));
  return new Response(null, { status: 204 });
}
