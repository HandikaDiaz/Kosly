import { afterEach, describe, expect, test, vi } from "vitest"
import robots from "../app/robots"

afterEach(() => vi.unstubAllEnvs())

describe("robots rules", () => {
  test("disallows everything outside production", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" })
  })

  test("allows public pages and blocks private/form routes in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test")
    const result = robots()
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" })
    expect(result.rules).toMatchObject({ disallow: expect.arrayContaining(["/dashboard", "/admin", "/api", "/ulasan", "/penghuni", "/rapor", "/*/daftar", "/*/bayar"]) })
    expect(result.sitemap).toBe("https://example.test/sitemap.xml")
  })
})
