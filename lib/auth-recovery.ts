const RESET_PASSWORD_PATH = "/reset-password";

export function getPasswordResetRedirect(appUrl: string | undefined) {
  if (!appUrl) throw new Error("Missing required environment variable: SCOUT_APP_URL");

  const callbackUrl = new URL("/auth/callback", appUrl);
  if (callbackUrl.protocol !== "http:" && callbackUrl.protocol !== "https:") {
    throw new Error("SCOUT_APP_URL must use http or https");
  }

  callbackUrl.searchParams.set("next", RESET_PASSWORD_PATH);
  return callbackUrl.toString();
}

export function getSafeRecoveryDestination(next: string | null) {
  return next === RESET_PASSWORD_PATH ? RESET_PASSWORD_PATH : "/";
}
