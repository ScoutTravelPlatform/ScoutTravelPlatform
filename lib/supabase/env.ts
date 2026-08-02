function requirePublicEnv(value: string | undefined, name: string) {

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseEnv() {
  return {
    // NEXT_PUBLIC values must use direct property access so Next.js can inline
    // them into the browser bundle. Dynamic process.env[name] access is not supported.
    url: requirePublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL"
    ),
    publishableKey: requirePublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    ),
  };
}
