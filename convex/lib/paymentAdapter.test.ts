import { describe, expect, test } from "vitest"
import type { Doc } from "../_generated/dataModel"
import { toPaymentPeriod } from "./paymentAdapter"

const charge = {
  _id: "charge" as never,
  _creationTime: 0,
  tenantId: "tenant" as never,
  propertyId: "property" as never,
  roomId: "room" as never,
  period: "2026-10",
  amount: 1_000_000,
  dueDate: 1_000,
  status: "paid" as const,
  paymentId: "payment" as never,
  createdAt: 0,
  paidAt: 2_000,
}

describe("payment adapter rent classification", () => {
  test("ignores confirmed DP/deposit payments", () => {
    const period = toPaymentPeriod(charge, { status: "confirmed", paymentType: "dp", purpose: "dp" } as Doc<"payments">)
    expect(period.confirmed).toBe(false)
    expect(period.paidAt).toBeUndefined()
  })

  test("keeps confirmed rent payment periods", () => {
    const period = toPaymentPeriod(charge, { status: "confirmed", paymentType: "full", purpose: "pelunasan" } as Doc<"payments">)
    expect(period).toMatchObject({ confirmed: true, paidAt: 2_000 })
  })
})
