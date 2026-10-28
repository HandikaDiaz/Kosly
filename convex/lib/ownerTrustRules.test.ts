import { describe, expect, it } from "vitest"
import { bucketLabel, cleanReportNote, computeResponseBucket, isAdminPriority, tenancyDisplay } from "./ownerTrustRules"

describe("owner trust rules", () => {
  it("buckets median response time at exact boundaries", () => {
    expect(computeResponseBucket([0.9, 0.9, 0.9, 0.9, 0.9])).toBe("kurang_dari_1_jam")
    expect(computeResponseBucket([1, 1, 1, 1, 1])).toBe("beberapa_jam")
    expect(computeResponseBucket([6, 6, 6, 6, 6])).toBe("dalam_sehari")
    expect(computeResponseBucket([24, 24, 24, 24, 24])).toBe("lebih_dari_sehari")
    expect(computeResponseBucket([1, 2, 3, 4])).toBeUndefined()
  })
  it("uses neutral labels and hides small tenancy samples", () => {
    expect(tenancyDisplay(2)).toBeUndefined()
    expect(tenancyDisplay(3)).toBe("3+")
    expect(tenancyDisplay(5)).toBe("5+")
    expect(tenancyDisplay(10)).toBe("10+")
    expect(bucketLabel("dalam_sehari")).toBe("dalam sehari")
  })
  it("rejects contact details and detects admin priority", () => {
    expect(cleanReportNote("ada https://example.com")).toBeNull()
    expect(cleanReportNote("hubungi 08123456789")).toBeNull()
    expect(cleanReportNote("catatan singkat")).toBe("catatan singkat")
    expect(isAdminPriority(2)).toBe(false)
    expect(isAdminPriority(3)).toBe(true)
  })
})
