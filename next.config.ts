import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning instead of error during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Ignore TypeScript errors on build
    // Use with caution
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
