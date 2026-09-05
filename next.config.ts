import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Britfone exposes data files via a tiny CommonJS wrapper that depends on
  // package-local __dirname. Keep the package external on the server so Node
  // resolves it from node_modules rather than bundling that wrapper into the
  // API route.
  serverExternalPackages: ["britfone"],
  outputFileTracingIncludes: {
    "/api/word": ["./node_modules/britfone/**/*"],
  },
};

export default nextConfig;
