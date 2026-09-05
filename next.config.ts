import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Britfone and WordNet expose package-local data files that should stay on
  // the Node server side. Keeping them external avoids bundling large lexical
  // datasets into application code and preserves their native filesystem paths.
  serverExternalPackages: ["britfone", "wordnet-db"],
  outputFileTracingIncludes: {
    "/api/word": [
      "./node_modules/britfone/**/*",
      "./node_modules/wordnet-db/**/*",
    ],
  },
};

export default nextConfig;
