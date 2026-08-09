import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.SCOUT_AUTH_ENABLED !== "true") return NextResponse.next();

  // VGS Show.js authenticates this machine-to-machine request with the
  // short-lived HMAC token verified by the route handler itself. It does not
  // carry an advisor's Supabase browser session and must not be redirected to
  // the interactive login page.
  if (request.nextUrl.pathname === "/api/secure-card-display") {
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
