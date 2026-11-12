import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@easy-invoice/db"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
