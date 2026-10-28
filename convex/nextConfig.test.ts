import { describe, expect, test } from "vitest"
import nextConfig from "../next.config"

describe("private token route headers", () => {
  test("protects pages and API routes from caching and referrer leakage", async () => {
    const rules = await nextConfig.headers?.()
    const sources = new Set((rules ?? []).map((rule) => rule.source))
    for (const source of ["/ulasan/:path*", "/penghuni/:path*", "/rapor/:path*", "/api/penghuni/:path*", "/api/rapor/:path*"]) {
      const rule = (rules ?? []).find((item) => item.source === source)
      expect(sources.has(source)).toBe(true)
      expect(rule?.headers).toEqual(expect.arrayContaining([
        { key: "Cache-Control", value: "no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ]))
    }
  })
})
