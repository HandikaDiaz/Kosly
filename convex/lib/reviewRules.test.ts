import { describe, expect, test } from "vitest"
import { buildStayLabel, cleanReviewText, computeStayDays, formatRatingSummary, formatReviewMonthYear, generateToken, hashToken, isTenancyEligible, shouldInvite, truncateReviewText } from "./reviewRules"

describe("review rules", () => {
  test("eligibility boundaries and stay labels", async () => {
    expect(computeStayDays(0, 29 * 86_400_000)).toBe(29)
    expect(isTenancyEligible({ stayDays: 29, hasConfirmedPayment: true }).reason).toBe("terlalu_singkat")
    expect(isTenancyEligible({ stayDays: 30, hasConfirmedPayment: false }).reason).toBe("belum_ada_pembayaran")
    expect(isTenancyEligible({ stayDays: 30, hasConfirmedPayment: true }).eligible).toBe(true)
    expect(buildStayLabel(45)).toBe("Penghuni, 45 hari")
    expect(buildStayLabel(240)).toBe("Penghuni, 8 bulan")
    expect(shouldInvite({ status: "moved_out", stayDays: 30, hasConfirmedPayment: true, now: 100 })).toBe(true)
    expect(shouldInvite({ status: "moved_out", stayDays: 29, hasConfirmedPayment: true, now: 100 })).toBe(false)
    expect(shouldInvite({ status: "active", stayDays: 30, hasConfirmedPayment: true, now: 100 })).toBe(false)
    expect(shouldInvite({ status: "active", stayDays: 90, hasConfirmedPayment: true, now: 100 })).toBe(true)
    expect(shouldInvite({ status: "active", stayDays: 90, hasConfirmedPayment: false, now: 100 })).toBe(false)
  })

  test("token is random, URL-safe, and hash is deterministic", async () => {
    const first = generateToken()
    const second = generateToken()
    expect(first).toHaveLength(64)
    expect(first).not.toBe(second)
    expect(first).toMatch(/^[a-f0-9]+$/)
    expect(await hashToken(first)).toBe(await hashToken(first))
    expect(await hashToken(first)).not.toBe(await hashToken(second))
  })

  test("text cleaning normalizes and truncates", () => {
    expect(cleanReviewText("  bagus\r\n\r\n\r\n sekali  ")).toBe("bagus\n\nsekali")
    expect(cleanReviewText("abcdef", 3)).toBe("abc")
    expect(() => cleanReviewText(" \n ")).toThrow()
  })

  test("rating summary and public date/text formatting respect boundaries", () => {
    expect(formatRatingSummary({ count: 0, sum: 0 })).toEqual({ count: 0, average: null })
    expect(formatRatingSummary({ count: 2, sum: 9 })).toEqual({ count: 2, average: null })
    expect(formatRatingSummary({ count: 3, sum: 13 })).toEqual({ count: 3, average: 4.3 })
    expect(formatReviewMonthYear(Date.UTC(2026, 9, 10))).toContain("2026")
    expect(truncateReviewText("pendek")).toEqual({ text: "pendek", truncated: false })
    expect(truncateReviewText("abcdef", 3)).toEqual({ text: "abc…", truncated: true })
  })
})
