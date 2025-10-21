import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/.wwebjs_auth/**", "**/node_modules/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
