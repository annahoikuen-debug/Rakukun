import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {},
  output: "standalone",
};

export default nextConfig;