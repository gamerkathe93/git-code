import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Allow large git push bodies (git-receive-pack can be hundreds of MB)
  experimental: {
    proxyClientMaxBodySize: 500 * 1024 * 1024, // 500MB
  },
};

export default nextConfig;
