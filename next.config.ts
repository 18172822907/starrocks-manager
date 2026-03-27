import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/starrocks-manager',
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
