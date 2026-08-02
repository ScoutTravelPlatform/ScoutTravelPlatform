import { createClient } from "@/lib/supabase/server";
import { createVgsCollectAccessToken } from "@/lib/vgs/server";

const portalTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!portalTokenPattern.test(token)) return Response.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_portal", { portal_token: token });
  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const accessToken = await createVgsCollectAccessToken();
    return Response.json(
      { accessToken },
      {
        headers: {
          "Cache-Control": "no-store, private",
          "Pragma": "no-cache",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json({ error: "Secure payment setup is temporarily unavailable" }, { status: 503 });
  }
}

