import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; the student import form accepts CSV/XLSX up to 10MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
