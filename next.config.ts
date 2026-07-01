import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Allow production builds even with type errors for initial development
    ignoreBuildErrors: true,
  },

  // External packages that should not be bundled
  serverExternalPackages: ["bcryptjs"],

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
