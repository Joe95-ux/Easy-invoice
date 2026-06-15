import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@easy-invoice/db"],
};

export default nextConfig;
