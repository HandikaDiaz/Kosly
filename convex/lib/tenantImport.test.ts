import { describe, expect, test } from "vitest"
import { previewImport, validateImportInput } from "./tenantImport"

const baseInput = {
  name: "  Siti   Aminah  ",
  phone: "0812 3456 7890",
  startedAt: Date.UTC(2025, 0, 1),
  nextDueDate: Date.UTC(2026, 9, 15, 4),
  monthlyRent: 1_500_000,
  paidStatus: "unpaid_current" as const,
}

describe("tenant import validation", () => {
  test("normalizes names and derives the due day in Jakarta", () => {
    const result = validateImportInput(baseInput, Date.UTC(2026, 9, 14, 17))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.name).toBe("Siti Aminah")
  })

  test("rejects a future start date and dates outside the import window", () => {
    expect(validateImportInput({ ...baseInput, startedAt: Date.UTC(2026, 9, 15) }, Date.UTC(2026, 9, 14))).toEqual({ ok: false, error: "Tanggal mulai tidak boleh di masa depan." })
    expect(validateImportInput({ ...baseInput, nextDueDate: Date.UTC(2026, 11, 20) }, Date.UTC(2026, 9, 14))).toEqual({ ok: false, error: "Tanggal jatuh tempo berikutnya harus berada dalam rentang ±62 hari." })
  })

  test("limits paid-ahead imports to twelve periods", () => {
    expect(validateImportInput({ ...baseInput, paidStatus: "paid_ahead", paidThroughPeriod: "2028-01" }, Date.UTC(2026, 9, 14))).toEqual({ ok: false, error: "Pembayaran di muka maksimal 12 periode." })
  })
})

test("preview clamps due dates and creates one payment for paid current imports", () => {
  const result = previewImport({ ...baseInput, nextDueDate: Date.UTC(2027, 1, 3), paidStatus: "paid_current", lastPaymentAt: Date.UTC(2027, 1, 2), lastPaymentAmount: 1_500_000 }, Date.UTC(2027, 1, 1))
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.dueDay).toBe(3)
  expect(result.periods).toHaveLength(1)
  expect(result.periods[0]?.status).toBe("paid")
  expect(result.payment?.billingPeriod).toBe("2027-02")
})
