import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonce here on purpose: nonces require every page to render dynamically
// (per Next.js's own CSP guide, node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md), which this app doesn't need. This follows
// that same doc's "Without Nonces" pattern instead — a real, if less strict,
// CSP is a big step up from having none at all, which is where this app
// started. img-src allows https: broadly because advisors paste arbitrary
// external image URLs into quote options (QuoteWorkspace.tsx). form-action
// allows *.stripe.com because the billing checkout/portal forms POST
// same-origin and then 303-redirect to Stripe's hosted pages (checkout.stripe.com,
// billing.stripe.com) — Chromium enforces form-action against the final
// redirect target, not just the form's own action URL, so 'self' alone
// blocks that redirect outright rather than just restricting the form itself.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://*.stripe.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\n/g, "");

const nextConfig: NextConfig = {
  // Lets the dev server accept requests (including HMR) from another device
  // on the LAN, used to test client-facing links (portal/intake) on a phone.
  allowedDevOrigins: ["192.168.1.131"],
  serverExternalPackages: ["@browserbasehq/sdk"],
  logging: {
    serverFunctions: false,
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
