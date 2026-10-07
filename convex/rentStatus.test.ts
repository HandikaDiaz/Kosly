import { describe, expect, test } from "vitest"
import { getRentStatus } from "../lib/rent-status"

describe("getRentStatus", () => {
  test("returns paid when the current charge is paid", () => {
    expect(getRentStatus({ isPaid: true, dueDate: Date.now() + 10_000, now: Date.now() })).toBe("paid")
  })

  test("returns overdue when an unpaid charge is past due", () => {
    expect(getRentStatus({ isPaid: false, dueDate: 1_000, now: 2_000 })).toBe("overdue")
  })

  test("returns due_soon when an unpaid charge is due within seven days", () => {
    expect(getRentStatus({ isPaid: false, dueDate: 6 * 24 * 60 * 60 * 1000, now: 0 })).toBe("due_soon")
  })

  test("returns upcoming when an unpaid charge is more than seven days away", () => {
    expect(getRentStatus({ isPaid: false, dueDate: 8 * 24 * 60 * 60 * 1000, now: 0 })).toBe("upcoming")
  })
})
