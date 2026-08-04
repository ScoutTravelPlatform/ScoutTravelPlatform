import type { NextConfig } from "next";

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
};

export default nextConfig;
