import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/clients",
        destination: "/contacts",
        permanent: true,
      },
      {
        source: "/clients/:id",
        destination: "/contacts/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
