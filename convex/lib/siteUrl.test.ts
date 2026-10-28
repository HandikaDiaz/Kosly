import { afterEach, describe, expect, test, vi } from "vitest"
import { getConvexBaseUrl } from "./siteUrl"
import { getSiteUrl, normalizeSiteUrl } from "../../lib/siteUrl"

afterEach(() => vi.unstubAllEnvs())

describe("site URL helpers", () => {
  test("normalizes protocol, whitespace, and trailing slashes", () => {
    expect(normalizeSiteUrl("  http://example.test///  ")).toBe("https://example.test")
    expect(getConvexBaseUrl(" https://example.test/app/// ")).toBe("https://example.test/app")
  })

  test("rejects an empty Convex base URL", () => {
    expect(() => getConvexBaseUrl(" ")).toThrow("APP_BASE_URL")
  })

  test("fails clearly when the production site URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("SITE_URL", "")
    expect(() => getSiteUrl()).toThrow("production")
  })
})
