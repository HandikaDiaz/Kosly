import { describe, expect, test } from "vitest"
import { GRACE_DAYS, classifyPeriod, computeRaporSummary, labelForTier } from "./raporRules"

const period = (overrides: Partial<{ periodId: string; tenancyId: string; dueDate: number; paidAt?: number; confirmed: boolean }> = {}) => ({ periodId: "p1", tenancyId: "t1", dueDate: Date.UTC(2025, 0, 10), confirmed: true, ...overrides })

describe("rapor rules", () => {
  test("classifies grace boundary and overdue payment", () => {
    const now = Date.UTC(2025, 0, 20)
    expect(classifyPeriod(period({ paidAt: Date.UTC(2025, 0, 13) }), now, new Set())).toBe("on_time")
    expect(classifyPeriod(period({ paidAt: Date.UTC(2025, 0, 14) }), now, new Set())).toBe("late")
    expect(GRACE_DAYS).toBe(3)
  })

  test("requires three considered periods and exposes only positive summary keys", () => {
    const now = Date.UTC(2025, 2, 20)
    const all = Array.from({ length: 10 }, (_, index) => period({ periodId: `p${index}`, dueDate: Date.UTC(2024, index, 1), paidAt: index === 9 ? Date.UTC(2024, index, 5) : Date.UTC(2024, index, 1) }))
    expect(computeRaporSummary([all[0], all[1]], now, new Set())).toEqual({ available: false })
    const summary = computeRaporSummary(all, now, new Set())
    expect(summary).toMatchObject({ available: true, tier: "usually", tenancyBucket: "1", monthsBucket: "6-11", generatedMonth: "Maret 2025" })
    expect(Object.keys(summary).sort()).toEqual(["available", "generatedMonth", "monthsBucket", "tenancyBucket", "tier"].sort())
  })

  test("uses buckets and excludes disputed periods", () => {
    const now = Date.UTC(2025, 0, 31)
    const periods = Array.from({ length: 4 }, (_, index) => period({ periodId: `p${index}`, tenancyId: index === 3 ? "t2" : "t1", dueDate: Date.UTC(2024, index, 1), paidAt: Date.UTC(2024, index, 1) }))
    expect(computeRaporSummary(periods, now, new Set(["p3"]))).toMatchObject({ tenancyBucket: "1", monthsBucket: "3-5", tier: "always" })
    expect(labelForTier("always")).toBe("Selalu tepat waktu")
    expect(labelForTier("usually")).toBe("Umumnya tepat waktu")
  })

  test("returns always at 1.0 and unavailable below usually threshold", () => {
    const now = Date.UTC(2025, 0, 31)
    const periods = Array.from({ length: 100 }, (_, index) => period({ periodId: `x${index}`, dueDate: Date.UTC(2024, index % 12, 1), paidAt: Date.UTC(2024, index % 12, 1) }))
    expect(computeRaporSummary(periods.slice(0, 3), now, new Set()).tier).toBe("always")
    const almost = periods.map((item, index) => index >= 89 ? { ...item, paidAt: item.dueDate + 10 * 86_400_000 } : item)
    expect(computeRaporSummary(almost.slice(0, 100), now, new Set())).toEqual({ available: false })
  })
})
