import { NextResponse } from "next/server";
import { getSafeRecoveryDestination } from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = getSafeRecoveryDestination(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/reset-password?error=invalid", requestUrl.origin));
}
