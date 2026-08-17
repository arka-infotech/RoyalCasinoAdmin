import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  allowedDevOrigins: ['10.14.89.227', 'localhost', '127.0.0.1', '192.168.0.209','192.168.1.10','192.168.0.104']
};

export default nextConfig;
