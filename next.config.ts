import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    const secureHeaders = [{ key: "Cache-Control", value: "no-store" }, { key: "Referrer-Policy", value: "no-referrer" }]
    return [
      { source: "/ulasan/:path*", headers: secureHeaders },
      { source: "/penghuni/:path*", headers: secureHeaders },
      { source: "/rapor/:path*", headers: secureHeaders },
      { source: "/api/penghuni/:path*", headers: secureHeaders },
      { source: "/api/rapor/:path*", headers: secureHeaders },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
    ],
  },
}

export default nextConfig
