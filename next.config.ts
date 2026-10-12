import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Not in Next's default list; keeps dev compiles to the primitives used.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
