import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/word": ["./node_modules/britfone/**/*"],
  },
};

export default nextConfig;
