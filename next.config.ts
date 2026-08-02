import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@browserbasehq/sdk"],
  logging: {
    serverFunctions: false,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
