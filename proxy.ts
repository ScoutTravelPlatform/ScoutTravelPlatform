import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.SCOUT_AUTH_ENABLED !== "true") return NextResponse.next();

  // Machine-to-machine routes that verify their own caller (a bearer secret,
  // a signed webhook payload, etc.) instead of a Supabase session cookie —
  // they must never be redirected to the interactive login page. Any new
  // webhook/cron endpoint needs to be added here, or its real caller will
  // silently get a 307 to /login instead of a response (this is exactly how
  // the Stripe billing webhook went unnoticed as broken until a direct test).
  const selfVerifyingRoutes = ["/api/cron/purge-expired-card-data", "/api/billing/webhook"];
  if (selfVerifyingRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname === "/login";
  const isSignup = request.nextUrl.pathname === "/signup";
  const isOnboarding = request.nextUrl.pathname === "/onboarding";
  const isClientPortal =
    request.nextUrl.pathname.startsWith("/portal/") ||
    request.nextUrl.pathname.startsWith("/api/portal/");
  const isClientIntake =
    request.nextUrl.pathname.startsWith("/intake/") ||
    request.nextUrl.pathname.startsWith("/api/intake/");
  const isTeamInvitation = request.nextUrl.pathname.startsWith("/join/");
  const isPasswordRecovery =
    request.nextUrl.pathname === "/forgot-password" ||
    request.nextUrl.pathname === "/reset-password" ||
    request.nextUrl.pathname === "/auth/callback";
  const isPublicLandingPage = request.nextUrl.pathname === "/";

  if (isClientPortal || isClientIntake || isTeamInvitation || isPasswordRecovery || isPublicLandingPage) return response;

  if (!data.user && !isLogin && !isSignup) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (data.user) {
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .limit(1);
    const hasOrganization = Boolean(memberships?.length);

    if (!hasOrganization && !isOnboarding) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      return NextResponse.redirect(onboardingUrl);
    }

    if (hasOrganization && (isLogin || isSignup || isOnboarding)) {
      const appUrl = request.nextUrl.clone();
      appUrl.pathname = "/dashboard";
      return NextResponse.redirect(appUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
