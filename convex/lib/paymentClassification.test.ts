import { describe, expect, test } from "vitest"
import { isRentPayment, RENT_PAYMENT_TYPES } from "./paymentClassification"
import { isTenancyEligible } from "./reviewRules"

describe("payment classification", () => {
  test("counts only confirmed full payments as rent", () => {
    expect(isRentPayment({ status: "confirmed", paymentType: "full", purpose: "pelunasan" })).toBe(true)
    expect(isRentPayment({ status: "confirmed", paymentType: "full", purpose: "dp" })).toBe(false)
    expect(isRentPayment({ status: "confirmed", paymentType: "dp", purpose: "dp" })).toBe(false)
  })

  test("classifies legacy payments explicitly by rent purpose", () => {
    expect(isRentPayment({ status: "confirmed", purpose: "pelunasan" })).toBe(true)
    expect(isRentPayment({ status: "confirmed", purpose: "sewa_bulanan" })).toBe(true)
    expect(isRentPayment({ status: "confirmed" })).toBe(false)
    expect(isRentPayment({ status: "confirmed", purpose: "dp" })).toBe(false)
  })

  test("does not count unknown future payment types", () => {
    expect(isRentPayment({ status: "confirmed", paymentType: "service_fee", purpose: "pelunasan" })).toBe(false)
    expect(RENT_PAYMENT_TYPES).toEqual(["full"])
  })

  test("DP alone cannot make a 30-day stay review-eligible", () => {
    const hasRentPayment = isRentPayment({ status: "confirmed", paymentType: "dp", purpose: "dp" })
    expect(isTenancyEligible({ stayDays: 30, hasConfirmedPayment: hasRentPayment }).eligible).toBe(false)
    const hasConfirmedRent = isRentPayment({ status: "confirmed", paymentType: "full", purpose: "sewa_bulanan" })
    expect(isTenancyEligible({ stayDays: 30, hasConfirmedPayment: hasConfirmedRent }).eligible).toBe(true)
  })
})
