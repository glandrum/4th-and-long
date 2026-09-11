import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },   // Google
      { hostname: "graph.facebook.com" },            // Facebook
      { hostname: "avatars.githubusercontent.com" }, // GitHub (future)
    ],
  },
};

export default nextConfig;
