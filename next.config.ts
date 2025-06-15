import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [],
    remotePatterns: [],
  },
  // In production, remove these ignores and fix the errors
  eslint: {
    // Warning instead of error during builds
    // It's better to fix eslint errors rather than ignore them
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    // It's better to fix typescript errors rather than ignore them
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
