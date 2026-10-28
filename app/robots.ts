import type { MetadataRoute } from "next"
import { getSiteUrl } from "../lib/siteUrl"

export default function robots(): MetadataRoute.Robots {
  const production = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
  if (!production) return { rules: { userAgent: "*", disallow: "/" } }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/login", "/onboarding", "/ulasan", "/penghuni", "/rapor", "/*/daftar", "/*/bayar"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
